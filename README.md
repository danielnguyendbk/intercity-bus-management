# Intercity Bus Management Backend

Phase 1 foundation for the university Intercity Bus Management System. The repository currently provides Django configuration, the accounts schema foundation, session authentication, Google social-account configuration, Django Admin, health checking, app boundaries, tests, and CI. Operations, booking, payment, and reporting workflows are intentionally not implemented yet.

## Approved runtime

- Python 3.12
- Django 5.2.17
- Django REST Framework 3.18.0
- django-allauth 65.19.2 with `socialaccount`
- mysqlclient 2.2.8
- MySQL 8.0+

## Local setup (PowerShell)

Create an empty local database and user in MySQL. Do not execute `docs/Database_IntercityBusManagement.sql`; Django migrations are authoritative.

```powershell
cd 'D:\Documents\PTIT DOC\Python\intercity-bus-management'
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and replace the placeholder values, or export the same environment variables in PowerShell. Django loads the repository-root `.env` file through `python-dotenv`.

```powershell
$env:DJANGO_SECRET_KEY='replace-for-local-development'
$env:DJANGO_DEBUG='True'
$env:MYSQL_DATABASE='intercity_bus_management'
$env:MYSQL_USER='intercity_bus_app'
$env:MYSQL_PASSWORD='replace-with-local-password'
$env:MYSQL_HOST='127.0.0.1'
$env:MYSQL_PORT='3306'
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Useful checks:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
```

Health endpoint: `GET http://127.0.0.1:8000/health/`.

## URL namespaces

- `/admin/`: Django Admin only.
- `/accounts/`: django-allauth URL skeleton.
- `/health/`: foundation health endpoint.
- `/api/accounts/`, `/api/operations/`, `/api/bookings/`, `/api/payments/`, `/api/common/`: business app URL skeletons.

## Schema workflow

`docs/Database_IntercityBusManagement.sql` is the approved reference, not a second migration mechanism. Create or change application tables only through reviewed Django migrations. MySQL-specific generated columns, triggers, and views belong in isolated explicit migrations in their owning app.

See `docs/IMPLEMENTATION_PLAN.md` and `docs/OPEN_QUESTIONS.md` before starting later phases.

## Intentionally unimplemented after Phase 1

- Register/login business API or UI and the complete explicit Google-linking UX.
- Employee CRUD.
- Station, route, bus, seat, trip, and staff-assignment models/workflows.
- Booking, ticket, availability locking, and expiration workflows.
- Cash/SePay payment processing, webhook handling, reconciliation, and reporting.
- MySQL generated-column, trigger, and view migrations.
