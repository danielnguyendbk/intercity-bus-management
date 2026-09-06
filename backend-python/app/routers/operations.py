from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.dependencies import require_staff, get_current_user
from app.models.user import User, Passenger
from app.models.bus import Trip, Bus
from app.models.operations import (
    Employee, Cargo, Maintenance, Feedback, FeedbackReply, TripAssignment,
    CargoStatus, EmployeeType, EmployeeStatus, AssignmentRole, MaintenanceStatus,
    FeedbackCategory, FeedbackStatus, FeedbackPriority, AuthorRole
)
from app.schemas.auth import UserDto
from app.schemas.admin import FeedbackResponse, CreateFeedbackRequest, ReplyFeedbackRequest, EmployeeDTO, CargoDTO
from app.services.auth_service import UserService

router = APIRouter(tags=["Operations & Feedbacks"])

# ── Profile Endpoints ──
@router.get("/api/auth/profile", response_model=UserDto)
def get_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.create_user_dto(current_user, db)

@router.put("/api/auth/profile", response_model=UserDto)
def update_user_profile(payload: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    passenger = db.query(Passenger).filter(Passenger.user_id == current_user.id).first()
    if passenger:
        if "fullName" in payload and payload["fullName"]:
            passenger.fullName = payload["fullName"]
        if "phone" in payload and payload["phone"] is not None:
            passenger.phone = payload["phone"]
        db.commit()
    return UserService.create_user_dto(current_user, db)

# ── Customer Feedback Endpoints ──
@router.post("/api/private/feedbacks", status_code=status.HTTP_201_CREATED)
def create_feedback(req: CreateFeedbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fb = Feedback(
        user_id=current_user.id,
        category=req.category,
        subject=req.subject,
        content=req.content,
        relatedTripId=req.relatedTripId,
        rating=req.rating,
        status=FeedbackStatus.NEW,
        priority=FeedbackPriority.MEDIUM
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"id": fb.id, "message": "Feedback submitted successfully"}

@router.get("/api/private/feedbacks/me")
def get_my_feedbacks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).filter(Feedback.user_id == current_user.id, Feedback.deletedAt.is_(None)).order_by(Feedback.id.desc()).all()
    res = []
    for f in feedbacks:
        replies = [
            {"id": r.id, "authorRole": r.authorRole.value, "content": r.content, "createdAt": r.createdAt}
            for r in f.replies
        ]
        res.append({
            "id": f.id,
            "category": f.category.value,
            "subject": f.subject,
            "content": f.content,
            "rating": f.rating,
            "status": f.status.value,
            "priority": f.priority.value if f.priority else None,
            "createdAt": f.createdAt,
            "replies": replies
        })
    return res

@router.get("/api/private/feedbacks/{feedback_id}")
def get_my_feedback(feedback_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.user_id == current_user.id, Feedback.deletedAt.is_(None)).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {
        "id": feedback.id,
        "category": feedback.category.value,
        "subject": feedback.subject,
        "content": feedback.content,
        "rating": feedback.rating,
        "status": feedback.status.value,
        "priority": feedback.priority.value if feedback.priority else None,
        "createdAt": feedback.createdAt,
        "replies": [{"id": reply.id, "authorRole": reply.authorRole.value, "content": reply.content, "createdAt": reply.createdAt} for reply in feedback.replies],
    }

@router.post("/api/private/feedbacks/{feedback_id}/reply")
def reply_feedback(feedback_id: int, req: ReplyFeedbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.deletedAt.is_(None)).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    role = AuthorRole.ADMIN if (current_user.role and "ADMIN" in current_user.role.name.upper()) else AuthorRole.CUSTOMER
    reply = FeedbackReply(
        feedback_id=fb.id,
        author_id=current_user.id,
        authorRole=role,
        content=req.content
    )
    db.add(reply)
    db.commit()
    return {"message": "Reply added successfully"}

@router.put("/api/private/feedbacks/{feedback_id}/close")
def close_feedback(feedback_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.status = FeedbackStatus.CLOSED
    db.commit()
    return {"message": "Feedback closed successfully"}

# ── Admin Employees Endpoints ──
@router.get("/api/admin/employees", dependencies=[Depends(require_staff)])
def get_all_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()

@router.get("/api/admin/employees/type/{employee_type}", dependencies=[Depends(require_staff)])
def get_employees_by_type(employee_type: str, db: Session = Depends(get_db)):
    try:
        employee_enum = EmployeeType[employee_type.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid employee type")
    return db.query(Employee).filter(Employee.employeeType == employee_enum, Employee.status == EmployeeStatus.ACTIVE).all()

@router.get("/api/admin/employees/top-experienced", dependencies=[Depends(require_staff)])
def get_top_experienced_employees(db: Session = Depends(get_db)):
    return db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).order_by(Employee.experienceYears.desc()).limit(5).all()

@router.get("/api/admin/employees/available", dependencies=[Depends(require_staff)])
def get_available_employees(from_: str = Query("", alias="from"), to: str = "", role: str = "", db: Session = Depends(get_db)):
    query = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE)
    if role:
        try:
            query = query.filter(Employee.employeeType == EmployeeType[role.upper()])
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid employee type")
    return query.all()

@router.post("/api/admin/employees", dependencies=[Depends(require_staff)])
def create_employee(payload: Dict[str, Any], db: Session = Depends(get_db)):
    emp = Employee(
        fullName=payload["fullName"],
        phone=payload.get("phone", ""),
        hometown=payload.get("hometown", ""),
        experienceYears=int(payload.get("experienceYears", 0)),
        employeeType=EmployeeType[payload["employeeType"].upper()],
        status=EmployeeStatus[payload.get("status", "ACTIVE").upper()]
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@router.put("/api/admin/employees/{emp_id}", dependencies=[Depends(require_staff)])
def update_employee(emp_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if "fullName" in payload and payload["fullName"]:
        emp.fullName = payload["fullName"]
    if "phone" in payload:
        emp.phone = payload["phone"]
    if "hometown" in payload:
        emp.hometown = payload["hometown"]
    if "experienceYears" in payload:
        emp.experienceYears = int(payload["experienceYears"])
    if "employeeType" in payload:
        emp.employeeType = EmployeeType[payload["employeeType"].upper()]
    if "status" in payload:
        emp.status = EmployeeStatus[payload["status"].upper()]
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/api/admin/employees/{emp_id}", dependencies=[Depends(require_staff)])
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"message": "Đã xóa nhân sự khỏi hệ thống", "id": emp_id}

# ── Admin Trip Assignments Endpoints ──
@router.post("/api/admin/trip-assignments/{trip_id}", dependencies=[Depends(require_staff)])
def assign_staff(trip_id: int, payload: Dict[str, Optional[int]], db: Session = Depends(get_db)):
    db.query(TripAssignment).filter(TripAssignment.tripId == trip_id).delete()
    db.commit()
    driver_id = payload.get("driverId")
    assistant_id = payload.get("assistantId")

    if driver_id:
        db.add(TripAssignment(tripId=trip_id, employeeId=driver_id, assignmentRole=AssignmentRole.DRIVER))
    if assistant_id:
        db.add(TripAssignment(tripId=trip_id, employeeId=assistant_id, assignmentRole=AssignmentRole.ASSISTANT))
    db.commit()
    return "Phân công nhân sự thành công!"

@router.get("/api/admin/trip-assignments/{trip_id}", dependencies=[Depends(require_staff)])
def get_trip_assignments(trip_id: int, db: Session = Depends(get_db)):
    return db.query(TripAssignment).filter(TripAssignment.tripId == trip_id).all()

@router.get("/api/admin/feedbacks/stats", dependencies=[Depends(require_staff)])
def get_feedback_stats(db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).filter(Feedback.deletedAt.is_(None)).all()
    by_status = {status_name: sum(1 for feedback in feedbacks if feedback.status and feedback.status.value == status_name) for status_name in ("NEW", "READ", "IN_PROGRESS", "RESOLVED", "CLOSED")}
    ratings = [feedback.rating for feedback in feedbacks if feedback.rating is not None]
    by_category = {}
    for feedback in feedbacks:
        category = feedback.category.value if feedback.category else "OTHER"
        by_category[category] = by_category.get(category, 0) + 1
    return {
        "total": len(feedbacks),
        "newCount": by_status["NEW"],
        "readCount": by_status["READ"],
        "inProgressCount": by_status["IN_PROGRESS"],
        "resolvedCount": by_status["RESOLVED"],
        "closedCount": by_status["CLOSED"],
        "byCategory": by_category,
        "averageRating": sum(ratings) / len(ratings) if ratings else None,
    }

def _feedback_response(feedback: Feedback) -> dict:
    user = feedback.user
    replies = [
        {"id": reply.id, "authorRole": reply.authorRole.value, "content": reply.content, "createdAt": reply.createdAt}
        for reply in feedback.replies
    ]
    return {
        "id": feedback.id,
        "userId": feedback.user_id,
        "username": user.username if user else "",
        "userFullName": user.passengers[0].fullName if user and user.passengers else "",
        "userEmail": user.email if user else "",
        "category": feedback.category.value,
        "categoryLabel": feedback.category.value,
        "subject": feedback.subject,
        "content": feedback.content,
        "relatedTripId": feedback.relatedTripId,
        "relatedTripLabel": None,
        "rating": feedback.rating,
        "status": feedback.status.value,
        "statusLabel": feedback.status.value,
        "priority": feedback.priority.value if feedback.priority else "MEDIUM",
        "priorityLabel": feedback.priority.value if feedback.priority else "MEDIUM",
        "createdAt": feedback.createdAt,
        "updatedAt": feedback.updatedAt,
        "replies": replies,
        "replyCount": len(replies),
    }

@router.get("/api/admin/feedbacks", dependencies=[Depends(require_staff)])
def get_admin_feedbacks(status: Optional[str] = None, category: Optional[str] = None, tripId: Optional[int] = None, keyword: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Feedback).filter(Feedback.deletedAt.is_(None)).order_by(Feedback.id.desc())
    if status:
        query = query.filter(Feedback.status == FeedbackStatus[status.upper()])
    if category:
        query = query.filter(Feedback.category == FeedbackCategory[category.upper()])
    if tripId is not None:
        query = query.filter(Feedback.relatedTripId == tripId)
    feedbacks = query.all()
    if keyword and keyword.strip():
        needle = keyword.strip().lower()
        feedbacks = [f for f in feedbacks if needle in f.subject.lower() or needle in f.content.lower()]
    return [_feedback_response(feedback) for feedback in feedbacks]

@router.get("/api/admin/feedbacks/{feedback_id}", dependencies=[Depends(require_staff)])
def get_admin_feedback(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.deletedAt.is_(None)).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return _feedback_response(feedback)

@router.post("/api/admin/feedbacks/{feedback_id}/reply", dependencies=[Depends(require_staff)])
def reply_as_admin(feedback_id: int, payload: ReplyFeedbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.deletedAt.is_(None)).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.add(FeedbackReply(feedback_id=feedback.id, author_id=current_user.id, authorRole=AuthorRole.ADMIN, content=payload.content))
    feedback.status = FeedbackStatus.IN_PROGRESS
    db.commit()
    db.refresh(feedback)
    return _feedback_response(feedback)

@router.patch("/api/admin/feedbacks/{feedback_id}/status", dependencies=[Depends(require_staff)])
def update_feedback_status(feedback_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.deletedAt.is_(None)).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    if payload.get("status"):
        try:
            feedback.status = FeedbackStatus[payload["status"].upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid feedback status")
    if payload.get("priority"):
        try:
            feedback.priority = FeedbackPriority[payload["priority"].upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid feedback priority")
    db.commit()
    db.refresh(feedback)
    return _feedback_response(feedback)

@router.delete("/api/admin/feedbacks/{feedback_id}", dependencies=[Depends(require_staff)])
def delete_admin_feedback(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id, Feedback.deletedAt.is_(None)).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    feedback.deletedAt = datetime.now()
    db.commit()
    return {"message": "Feedback deleted successfully"}

# ── Admin Cargos Endpoints ──
@router.get("/api/admin/cargo", dependencies=[Depends(require_staff)])
def get_all_cargos(tripId: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Cargo)
    if tripId:
        query = query.filter(Cargo.trip_id == tripId)
    if status:
        query = query.filter(Cargo.status == status.upper())
    return query.all()

@router.post("/api/admin/cargo", dependencies=[Depends(require_staff)])
def create_cargo(payload: Dict[str, Any], db: Session = Depends(get_db)):
    cargo = Cargo(
        trip_id=int(payload["tripId"]),
        senderName=payload["senderName"],
        receiverName=payload["receiverName"],
        receiverPhone=payload["receiverPhone"],
        cargoType=payload.get("cargoType", ""),
        weight=Decimal(str(payload.get("weight", 0))),
        fee=Decimal(str(payload.get("fee", 0))),
        status=CargoStatus.PENDING
    )
    db.add(cargo)
    db.commit()
    db.refresh(cargo)
    return cargo

@router.put("/api/admin/cargo/{cargo_id}/status", dependencies=[Depends(require_staff)])
def update_cargo_status(cargo_id: int, payload: Dict[str, str], db: Session = Depends(get_db)):
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo not found")
    status_str = payload.get("status", "").upper()
    cargo.status = CargoStatus[status_str]
    db.commit()
    db.refresh(cargo)
    return cargo

# ── Admin Maintenance Endpoints ──
@router.get("/api/admin/maintenance", dependencies=[Depends(require_staff)])
def get_maintenances(busId: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Maintenance)
    if busId:
        query = query.filter(Maintenance.bus_id == busId)
    if status:
        query = query.filter(Maintenance.status == status.upper())
    return query.all()

@router.post("/api/admin/maintenance", dependencies=[Depends(require_staff)])
def create_maintenance(payload: Dict[str, Any], db: Session = Depends(get_db)):
    bus_id = int(payload["busId"])
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    m = Maintenance(
        bus_id=bus_id,
        description=payload.get("description", ""),
        cost=Decimal(str(payload.get("cost", 0))),
        maintenanceDate=date.fromisoformat(payload["maintenanceDate"]) if "maintenanceDate" in payload else date.today(),
        status=MaintenanceStatus[payload.get("status", "SCHEDULED").upper()]
    )
    db.add(m)
    bus.lastMaintenanceDate = date.today()
    db.commit()
    db.refresh(m)
    return m
