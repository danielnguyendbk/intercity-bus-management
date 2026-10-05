export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  description?: string;
}

export interface CityData {
  city: string;
  cityLabel: string;
  districts: string[];
  pickupPoints: PickupPoint[];
}

export const LOCATION_DATA: CityData[] = [
  {
    city: "TP.HCM",
    cityLabel: "TP. Hồ Chí Minh",
    districts: ["Quận 1", "Quận 3", "Quận 5", "Quận 10", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Quận Thủ Đức", "Huyện Bình Chánh", "Huyện Nhà Bè", "Huyện Hóc Môn"],
    pickupPoints: [
      { id: "hcm-1", name: "Văn phòng xe Bến Thành", address: "Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM", description: "Gần bến xe miền Đông cũ" },
      { id: "hcm-2", name: "Siêu thịcoopmart Lý Thường Kiệt", address: "Số 121 Lý Thường Kiệt, Quận 11, TP.HCM", description: "Trước cửa siêu thị, có chỗ đậu xe" },
      { id: "hcm-3", name: "Công viên Văn hóa Đầm Sen", address: "Đường Đầm Sen, Quận 11, TP.HCM", description: "Cổng chính công viên" },
      { id: "hcm-4", name: "Nhà hàng Bạch Kỳ - Lăng Cả", address: "Số 58bis Lê Thánh Tôn, Quận 1, TP.HCM", description: "Gần Dinh Độc Lập" },
      { id: "hcm-5", name: "Trạm xăng Petro Đinh Tiên Hoàng", address: "Đinh Tiên Hoàng, Quận 1, TP.HCM", description: "Đối diện Dinh Độc Lập" },
      { id: "hcm-6", name: "Đại học Khoa học Tự nhiên Q.5", address: "227 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM", description: "Cổng chính trường ĐH KHTN" },
      { id: "hcm-7", name: "Trường PTTH Chuyên Lê Hồng Phong", address: "Số 215 Lý Thường Kiệt, Quận 11, TP.HCM", description: "Cổng trường phía đường Lý Thường Kiệt" },
      { id: "hcm-8", name: "Trạm xe bus Sân bay Tân Sơn Nhất", address: "Đường Trường Sơn, Quận Tân Bình, TP.HCM", description: "Ga quốc nội - trạm xe buýt công cộng" },
    ],
  },
  {
    city: "Hà Nội",
    cityLabel: "Hà Nội",
    districts: ["Quận Ba Đình", "Quận Hoàn Kiếm", "Quận Hai Bà Trưng", "Quận Đống Đa", "Quận Tây Hồ", "Quận Cầu Giấy", "Quận Thanh Xuân", "Quận Hoàng Mai", "Quận Long Biên", "Quận Bắc Từ Liêm", "Quận Nam Từ Liêm", "Huyện Thanh Trì", "Huyện Gia Lâm"],
    pickupPoints: [
      { id: "hn-1", name: "Văn phòng xe Mỹ Đình", address: "Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội", description: "Gần cổng Sân vận động Mỹ Đình" },
      { id: "hn-2", name: "Bến xe Mỹ Đình 2", address: "Phạm Hùng, Nam Từ Liêm, Hà Nội", description: "Bến xe khách Mỹ Đình - cổng chính" },
      { id: "hn-3", name: "Bến xe Giáp Bát", address: "Giáp Bát, Quận Hoàng Mai, Hà Nội", description: "Bến xe khách Giáp Bát" },
      { id: "hn-4", name: "Đại học Bách Khoa Hà Nội", address: "Số 1 Đại Cồ Việt, Quận Hai Bà Trưng, Hà Nội", description: "Cổng chính ĐH Bách Khoa" },
      { id: "hn-5", name: "Ga tàu Hà Nội", address: "Quận Hoàn Kiếm, Hà Nội", description: "Trước ga Hà Nội - bãi đỗ xe" },
      { id: "hn-6", name: "Công viên Thống Nhất", address: "Đường Trần Nhân Tông, Quận Hai Bà Trưng, Hà Nội", description: "Cổng chính công viên Thống Nhất" },
      { id: "hn-7", name: "Trạm xăng Petro Minh Khai", address: "458 Minh Khai, Quận Hai Bà Trưng, Hà Nội", description: "Đối diện công viên Thống Nhất" },
      { id: "hn-8", name: "Học viện Ngân hàng", address: "Số 12 Chùa Bộc, Quận Đống Đa, Hà Nội", description: "Cổng trường HV Ngân hàng" },
    ],
  },
  {
    city: "Đà Nẵng",
    cityLabel: "Đà Nẵng",
    districts: ["Quận Hải Châu", "Quận Thanh Khê", "Quận Sơn Trà", "Quận Ngũ Hành Sơn", "Quận Liên Chiểu", "Huyện Hòa Vang", "Huyện Hoàng Sa"],
    pickupPoints: [
      { id: "dn-1", name: "Văn phòng xe Trần Phú", address: "Số 78 Đường Trần Phú, Quận Hải Châu, Đà Nẵng", description: "Gần chợ Cồn" },
      { id: "dn-2", name: "Ga tàu Đà Nẵng", address: "Số 5 Đường Hai Bà Trưng, Quận Hải Châu, Đà Nẵng", description: "Trước cửa ga Đà Nẵng" },
      { id: "dn-3", name: "Bến xe trung tâm Đà Nẵng", address: "Đường Tiểu La, Quận Hải Châu, Đà Nẵng", description: "Bến xe khách trung tâm Đà Nẵng" },
      { id: "dn-4", name: "Trường ĐH Bách Khoa Đà Nẵng", address: "54 Nguyễn Lương Bằng, Quận Liên Chiểu, Đà Nẵng", description: "Cổng chính ĐH Bách Khoa" },
      { id: "dn-5", name: "Cầu Thuận Phước", address: "Đường Điện Biên Phủ, Quận Thanh Khê, Đà Nẵng", description: "Chân cầu Thuận Phước - bãi đỗ" },
      { id: "dn-6", name: "Đà Nẵng Cathedral", address: "156 Đường Trần Phú, Quận Hải Châu, Đà Nẵng", description: "Nhà thờ Đà Nẵng - vỉa hè rộng" },
      { id: "dn-7", name: "Công viên Biển Đông", address: "Sơn Trà, Đà Nẵng", description: "Công viên Biển Đông - gần cầu Rồng" },
    ],
  },
  {
    city: "Cần Thơ",
    cityLabel: "Cần Thơ",
    districts: ["Quận Ninh Kiều", "Quận Bình Thủy", "Quận Cái Răng", "Quận Thốt Nốt", "Quận Ô Môn", "Huyện Phong Điền", "Huyện Cờ Đỏ", "Huyện Vĩnh Thạnh"],
    pickupPoints: [
      { id: "ct-1", name: "Văn phòng xe Ninh Kiều", address: "Số 28 Đường Nguyễn Đình Chiểu, Quận Ninh Kiều, Cần Thơ", description: "Gần bến Ninh Kiều" },
      { id: "ct-2", name: "Bến xe Cần Thơ", address: "Đường Quang Trung, Quận Ninh Kiều, Cần Thơ", description: "Bến xe khách Cần Thơ" },
      { id: "ct-3", name: "Cảng Ninh Kiều", address: "Bến Ninh Kiều, Quận Ninh Kiều, Cần Thơ", description: "Cảng sông Cần Thơ - nơi tàu cập bến" },
      { id: "ct-4", name: "Trường ĐH Cần Thơ", address: "Khu II, Đường 3/2, Quận Ninh Kiều, Cần Thơ", description: "Cổng chính ĐH Cần Thơ" },
      { id: "ct-5", name: "Trạm xăng Petro Cái Khế", address: "Đường Nguyễn Văn Cừ, Quận Ninh Kiều, Cần Thơ", description: "Cạnh cầu Cái Khế" },
      { id: "ct-6", name: "Vincom Cần Thơ", address: "Đường Nguyễn Văn Cừ, Quận Ninh Kiều, Cần Thơ", description: "Trung tâm thương mại Vincom" },
    ],
  },
  {
    city: "Huế",
    cityLabel: "Huế",
    districts: ["Thành phố Huế", "Huyện Phong Điền", "Huyện Quảng Điền", "Huyện Phú Vang", "Huyện Hương Thủy", "Huyện Hương Trà"],
    pickupPoints: [
      { id: "hue-1", name: "Văn phòng xe Phan Chu Trinh", address: "Số 42 Đường Phan Chu Trinh, TP. Huế", description: "Gần chợ Đông Ba" },
      { id: "hue-2", name: "Bến xe Phía Nam Huế", address: "Đường An Vân, TP. Huế", description: "Bến xe phía Nam thành phố" },
      { id: "hue-3", name: "Cầu Tràng Tiền", address: "Đường Trần Hưng Đạo, TP. Huế", description: "Gần cầu Tràng Tiền" },
      { id: "hue-4", name: "Đại học Huế", address: "Số 22 Lâm Hoằng, TP. Huế", description: "Cổng chính ĐH Huế" },
      { id: "hue-5", name: "Trạm xăng Petro Vỹ Dạ", address: "Đường Vỹ Dạ, TP. Huế", description: "Gần cầu Đông Ba" },
      { id: "hue-6", name: "Sân bay Phú Bài", address: "Xã Phú Bài, Huyện Hương Thủy, Huế", description: "Trước cửa nhà ga sân bay" },
    ],
  },
  {
    city: "Nha Trang",
    cityLabel: "Nha Trang",
    districts: ["Thành phố Nha Trang", "Huyện Ninh Hòa", "Huyện Khánh Vĩnh", "Huyện Diên Khánh", "Huyện Cam Lâm"],
    pickupPoints: [
      { id: "nt-1", name: "Văn phòng xe Trần Phú", address: "Số 1 Đường Trần Phú, TP. Nha Trang", description: "Gần bờ biển Nha Trang" },
      { id: "nt-2", name: "Bến xe Nha Trang", address: "Đường 23/10, TP. Nha Trang", description: "Bến xe khách Nha Trang" },
      { id: "nt-3", name: "Vinpearl Land Nha Trang", address: "Đảo Hòn Tre, TP. Nha Trang", description: "Cổng vào Vinpearl Land" },
      { id: "nt-4", name: "Trường ĐH Nha Trang", address: "02 Nguyễn Đình Chiểu, TP. Nha Trang", description: "Cổng chính ĐH Nha Trang" },
      { id: "nt-5", name: "Tháp Trầm Hương", address: "Đường Trần Phú, TP. Nha Trang", description: "Gần tháp Trầm Hương" },
      { id: "nt-6", name: "Trạm xăng Petro Vĩnh Điềm", address: "Vĩnh Điềm, TP. Nha Trang", description: "Đường Vĩnh Hải" },
    ],
  },
  {
    city: "Vũng Tàu",
    cityLabel: "Vũng Tàu",
    districts: ["Thành phố Vũng Tàu", "Huyện Châu Đức", "Huyện Xuyên Mộc", "Huyện Long Điền", "Huyện Đất Đỏ"],
    pickupPoints: [
      { id: "vt-1", name: "Văn phòng xe Bến xe Vũng Tàu", address: "Số 444 Đường Đống Đa, TP. Vũng Tàu", description: "Bến xe khách Vũng Tàu" },
      { id: "vt-2", name: "Bãi Trước Vũng Tàu", address: "Bãi Trước, TP. Vũng Tàu", description: "Gần tượng Chúa Kitô Vua" },
      { id: "vt-3", name: "Bãi Sau Vũng Tàu", address: "Bãi Sau, TP. Vũng Tàu", description: "Khu du lịch Bãi Sau" },
      { id: "vt-4", name: "Cảng Côn Đảo", address: "Bến cảng Côn Đảo, TP. Vũng Tàu", description: "Cảng tàu ra Côn Đảo" },
      { id: "vt-5", name: "Trạm xăng Petro Ba Cu", address: "Đường Ba Cu, TP. Vũng Tàu", description: "Gần bến xe" },
      { id: "vt-6", name: "Đền Thờ Bác Hồ", address: "Số 6 Đường Hạ Long, TP. Vũng Tàu", description: "Gần đền thờ Bác Hồ" },
    ],
  },
  {
    city: "Đà Lạt",
    cityLabel: "Đà Lạt",
    districts: ["Thành phố Đà Lạt", "Huyện Bảo Lâm", "Huyện Đam Rông", "Huyện Lạc Dương", "Huyện Lâm Hà"],
    pickupPoints: [
      { id: "dl-1", name: "Văn phòng xe Đà Lạt", address: "Số 01 Đường Nguyễn Trung Trực, TP. Đà Lạt", description: "Gần chợ Đà Lạt" },
      { id: "dl-2", name: "Bến xe Liên tỉnh Đà Lạt", address: "Đường Tô Hiến Thành, TP. Đà Lạt", description: "Bến xe khách Đà Lạt" },
      { id: "dl-3", name: "Hồ Xuân Hương", address: "Đường Nguyễn Chí Thanh, TP. Đà Lạt", description: "Gần Hồ Xuân Hương" },
      { id: "dl-4", name: "Trường ĐH Đà Lạt", address: "Số 1 Đường Lý Tự Trọng, TP. Đà Lạt", description: "Cổng chính ĐH Đà Lạt" },
      { id: "dl-5", name: "Đường Hồ Tùng Mậu", address: "Hồ Tùng Mậu, TP. Đà Lạt", description: "Gần vực hồ Than Thở" },
      { id: "dl-6", name: "Big C Đà Lạt", address: "Khu đô thị Mê Linh, TP. Đà Lạt", description: "Trước siêu thị Big C" },
    ],
  },
  {
    city: "Hải Phòng",
    cityLabel: "Hải Phòng",
    districts: ["Quận Hồng Bàng", "Quận Lê Chân", "Quận Ngô Quyền", "Quận Kiến An", "Quận Đồ Sơn", "Quận Dương Kinh", "Huyện An Dương", "Huyện Vĩnh Bảo", "Huyện Tiên Lãng"],
    pickupPoints: [
      { id: "hp-1", name: "Văn phòng xe Hải Phòng", address: "Số 18 Đường Lê Lợi, Quận Hồng Bàng, Hải Phòng", description: "Gần chợ Sắt" },
      { id: "hp-2", name: "Bến xe Thượng Lý", address: "Đường Thượng Lý, Quận Hồng Bàng, Hải Phòng", description: "Bến xe khách Thượng Lý" },
      { id: "hp-3", name: "Ga tàu Hải Phòng", address: "Số 1 Đường Cầu Nam, Quận Lê Chân, Hải Phòng", description: "Trước cửa ga Hải Phòng" },
      { id: "hp-4", name: "Bến phà Đồ Nhĩ", address: "Đường Bạch Đằng, Quận Hồng Bàng, Hải Phòng", description: "Gần bến phà Đồ Nhĩ" },
      { id: "hp-5", name: "Cảng Hải Phòng", address: "Đường Máy Từ, Quận Hồng Bàng, Hải Phòng", description: "Gần cảng Hải Phòng" },
      { id: "hp-6", name: "Vincom Center Hải Phòng", address: "Đường Lê Hồng Phong, Quận Đồ Sơn, Hải Phòng", description: "Trung tâm thương mại Vincom" },
    ],
  },
  {
    city: "Quảng Ninh",
    cityLabel: "Quảng Ninh",
    districts: ["Thành phố Hạ Long", "Thành phố Uông Bí", "Thành phố Cẩm Phả", "Thành phố Móng Cái", "Thị xã Quảng Yên", "Huyện Bình Liêu", "Huyện Đầm Hà", "Huyện Hải Hà", "Huyện Tiên Yên", "Huyện Ba Chẽ", "Huyện Vân Đồn"],
    pickupPoints: [
      { id: "qn-1", name: "Văn phòng xe Hạ Long", address: "Số 5 Đường Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh", description: "Gần bến xe Hạ Long" },
      { id: "qn-2", name: "Bến xe Hạ Long", address: "Đường Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh", description: "Bến xe khách Hạ Long" },
      { id: "qn-3", name: "Cảng tàu quốc tế Hạ Long", address: "Đường Hạ Long, TP. Hạ Long, Quảng Ninh", description: "Cảng tàu khách quốc tế Tuần Châu" },
      { id: "qn-4", name: "Cáp treo Hạ Long", address: "Khu du lịch Bãi Cháy, TP. Hạ Long, Quảng Ninh", description: "Trạm cáp treo Hạ Long" },
      { id: "qn-5", name: "Bến xe Móng Cái", address: "Thành phố Móng Cái, Quảng Ninh", description: "Bến xe khách Móng Cái" },
      { id: "qn-6", name: "Trạm xăng Petro Bãi Cháy", address: "Bãi Cháy, TP. Hạ Long, Quảng Ninh", description: "Đường Văn Lang" },
    ],
  },
  {
    city: "Bình Dương",
    cityLabel: "Bình Dương",
    districts: ["Thành phố Thủ Dầu Một", "Thị xã Bến Cát", "Thị xã Tân Uyên", "Thành phố Dĩ An", "Thành phố Thuận An", "Huyện Bắc Tân Uyên", "Huyện Phú Giáo", "Huyện Dầu Tiếng"],
    pickupPoints: [
      { id: "bd-1", name: "Văn phòng xe Thủ Dầu Một", address: "Số 88 Đường Cách Mạng Tháng 8, TP. Thủ Dầu Một, Bình Dương", description: "Gần chợ Thủ Dầu Một" },
      { id: "bd-2", name: "Bến xe Thủ Dầu Một", address: "Đường Trần Hưng Đạo, TP. Thủ Dầu Một, Bình Dương", description: "Bến xe khách Thủ Dầu Một" },
      { id: "bd-3", name: "KCN Sóng Thần", address: "Khu công nghiệp Sóng Thần, Bình Dương", description: "Cổng KCN Sóng Thần" },
      { id: "bd-4", name: "Trường ĐH Bình Dương", address: "Đường Nguyễn Văn Linh, TP. Thủ Dầu Một, Bình Dương", description: "Cổng chính ĐH Bình Dương" },
      { id: "bd-5", name: "Trạm xăng Petro Dĩ An", address: "Thành phố Dĩ An, Bình Dương", description: "Đường DT 743" },
    ],
  },
  {
    city: "Cà Mau",
    cityLabel: "Cà Mau",
    districts: ["Thành phố Cà Mau", "Huyện U Minh", "Huyện Thới Bình", "Huyện Trần Văn Thời", "Huyện Cái Nước", "Huyện Đầm Dơi", "Huyện Ngọc Hiển", "Huyện Năm Căn", "Huyện Phú Tân"],
    pickupPoints: [
      { id: "cm-1", name: "Văn phòng xe Cà Mau", address: "Số 10 Đường Lý Bôn, TP. Cà Mau", description: "Gần chợ Cà Mau" },
      { id: "cm-2", name: "Bến xe Cà Mau", address: "Đường Nguyễn Tất Thành, TP. Cà Mau", description: "Bến xe khách Cà Mau" },
      { id: "cm-3", name: "Cảng Năm Căn", address: "Huyện Năm Căn, Cà Mau", description: "Cảng cá Năm Căn" },
      { id: "cm-4", name: "Trạm xăng Petro Cà Mau", address: "Đường Trần Hưng Đạo, TP. Cà Mau", description: "Trung tâm TP. Cà Mau" },
      { id: "cm-5", name: "Đất Mũi Cà Mau", address: "Xã Đất Mũi, Huyện Ngọc Hiển, Cà Mau", description: "Công viên Đất Mũi" },
    ],
  },
  {
    city: "An Giang",
    cityLabel: "An Giang",
    districts: ["Thành phố Long Xuyên", "Thành phố Châu Đốc", "Thị xã Tân Châu", "Huyện An Phú", "Huyện Phú Tân", "Huyện Châu Phong", "Huyện Tịnh Biên", "Huyện Tri Tôn", "Huyện Thoại Sơn", "Huyện Châu Thành"],
    pickupPoints: [
      { id: "ag-1", name: "Văn phòng xe Long Xuyên", address: "Số 55 Đường Lê Lợi, TP. Long Xuyên, An Giang", description: "Gần chợ Long Xuyên" },
      { id: "ag-2", name: "Bến xe Long Xuyên", address: "Đường Võ Văn Kiệt, TP. Long Xuyên, An Giang", description: "Bến xe khách Long Xuyên" },
      { id: "ag-3", name: "Bến xe Châu Đốc", address: "Đường Lê Lợi, TP. Châu Đốc, An Giang", description: "Bến xe khách Châu Đốc" },
      { id: "ag-4", name: "Miếu Bà Chúa Xứ", address: "Núi Sam, TP. Châu Đốc, An Giang", description: "Núi Sam - Miếu Bà" },
      { id: "ag-5", name: "Trạm xăng Petro Tân Châu", address: "Thị xã Tân Châu, An Giang", description: "Trung tâm Tân Châu" },
    ],
  },
  {
    city: "Kiên Giang",
    cityLabel: "Kiên Giang",
    districts: ["Thành phố Rạch Giá", "Thành phố Hà Tiên", "Thị xã Kiên Lương", "Huyện Châu Thành", "Huyện Giồng Giềng", "Huyện Gò Quao", "Huyện Hòn Đất", "Huyện Kiên Hải", "Huyện Nam Du", "Huyện Phú Quốc", "Huyện Tân Hiệp", "Huyện U Minh Thượng", "Huyện Vĩnh Thuận"],
    pickupPoints: [
      { id: "kg-1", name: "Văn phòng xe Rạch Giá", address: "Số 20 Đường Nguyễn Trung Trực, TP. Rạch Giá, Kiên Giang", description: "Gần bến xe Rạch Giá" },
      { id: "kg-2", name: "Bến xe Rạch Giá", address: "Đường Nguyễn Bỉnh Khiêm, TP. Rạch Giá, Kiên Giang", description: "Bến xe khách Rạch Giá" },
      { id: "kg-3", name: "Bến tàu Rạch Giá - Phú Quốc", address: "Cảng Rạch Giá, TP. Rạch Giá, Kiên Giang", description: "Bến tàu đi Phú Quốc" },
      { id: "kg-4", name: "Cảng Hà Tiên", address: "Thành phố Hà Tiên, Kiên Giang", description: "Cảng khách Hà Tiên" },
      { id: "kg-5", name: "Phú Quốc - Bến xe Dương Đông", address: "Thành phố Phú Quốc, Kiên Giang", description: "Bến xe Dương Đông" },
      { id: "kg-6", name: "Trạm xăng Petro Kiên Lương", address: "Thị xã Kiên Lương, Kiên Giang", description: "Gần cầu Kiên Lương" },
    ],
  },
  {
    city: "Nghệ An",
    cityLabel: "Nghệ An",
    districts: ["Thành phố Vinh", "Thị xã Cửa Lò", "Thị xã Thái Hòa", "Huyện Nghi Lộc", "Huyện Nam Đàn", "Huyện Hưng Nguyên", "Huyện Đô Lương", "Huyện Tân Kỳ", "Huyện Yên Thành", "Huyện Diễn Châu", "Huyện Thanh Chương"],
    pickupPoints: [
      { id: "na-1", name: "Văn phòng xe Vinh", address: "Số 100 Đường Quang Trung, TP. Vinh, Nghệ An", description: "Gần quảng trường Vinh" },
      { id: "na-2", name: "Bến xe Vinh", address: "Đường Trường Tiền, TP. Vinh, Nghệ An", description: "Bến xe khách Vinh" },
      { id: "na-3", name: "Ga tàu Vinh", address: "Đường Trường Tiền, TP. Vinh, Nghệ An", description: "Ga tàu Vinh" },
      { id: "na-4", name: "Trường ĐH Vinh", address: "Số 182 Đường Lê Lợi, TP. Vinh, Nghệ An", description: "Cổng chính ĐH Vinh" },
      { id: "na-5", name: "Cửa Lò", address: "Thị xã Cửa Lò, Nghệ An", description: "Bãi biển Cửa Lò" },
      { id: "na-6", name: "Trạm xăng Petro Nam Đàn", address: "Huyện Nam Đàn, Nghệ An", description: "Gần Khu di tích Chủ tịch HCM" },
    ],
  },
];

// Simple location list for backward compatibility (trips search)
export const LOCATIONS = LOCATION_DATA.map((c) => c.city);

export const getCityData = (city: string): CityData | undefined =>
  LOCATION_DATA.find((c) => c.city === city);
