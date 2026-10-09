export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface CityData {
  city: string;
  cityLabel: string;
  districts: string[];
  center: { lat: number; lng: number };
  pickupPoints: PickupPoint[];
}

export const LOCATION_DATA: CityData[] = [
  {
    city: "TP.HCM",
    cityLabel: "TP. Hồ Chí Minh",
    center: { lat: 10.7769, lng: 106.7009 },
    districts: ["Quận 1", "Quận 3", "Quận 5", "Quận 10", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Quận Thủ Đức", "Huyện Bình Chánh", "Huyện Nhà Bè", "Huyện Hóc Môn"],
    pickupPoints: [
      { id: "hcm-1", name: "Văn phòng xe Bến Thành", address: "Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM", description: "Gần bến xe miền Đông cũ", lat: 10.7725, lng: 106.6980 },
      { id: "hcm-2", name: "Siêu thị Co.opmart Lý Thường Kiệt", address: "Số 121 Lý Thường Kiệt, Quận 11, TP.HCM", description: "Trước cửa siêu thị, có chỗ đậu xe", lat: 10.7656, lng: 106.6575 },
      { id: "hcm-3", name: "Công viên Văn hóa Đầm Sen", address: "Đường Đầm Sen, Quận 11, TP.HCM", description: "Cổng chính công viên", lat: 10.7681, lng: 106.6433 },
      { id: "hcm-4", name: "Nhà hàng Bạch Kỳ - Lăng Cả", address: "Số 58bis Lê Thánh Tôn, Quận 1, TP.HCM", description: "Gần Dinh Độc Lập", lat: 10.7778, lng: 106.7012 },
      { id: "hcm-5", name: "Trạm xăng Petro Đinh Tiên Hoàng", address: "Đinh Tiên Hoàng, Quận 1, TP.HCM", description: "Đối diện Dinh Độc Lập", lat: 10.7928, lng: 106.6975 },
      { id: "hcm-6", name: "Đại học Khoa học Tự nhiên Q.5", address: "227 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM", description: "Cổng chính trường ĐH KHTN", lat: 10.7628, lng: 106.6825 },
      { id: "hcm-7", name: "Trường PTTH Chuyên Lê Hồng Phong", address: "Số 215 Lý Thường Kiệt, Quận 11, TP.HCM", description: "Cổng trường phía đường Lý Thường Kiệt", lat: 10.7634, lng: 106.6582 },
      { id: "hcm-8", name: "Trạm xe bus Sân bay Tân Sơn Nhất", address: "Đường Trường Sơn, Quận Tân Bình, TP.HCM", description: "Ga quốc nội - trạm xe buýt công cộng", lat: 10.8142, lng: 106.6664 },
    ],
  },
  {
    city: "Hà Nội",
    cityLabel: "Hà Nội",
    center: { lat: 21.0285, lng: 105.8542 },
    districts: ["Quận Ba Đình", "Quận Hoàn Kiếm", "Quận Hai Bà Trưng", "Quận Đống Đa", "Quận Tây Hồ", "Quận Cầu Giấy", "Quận Thanh Xuân", "Quận Hoàng Mai", "Quận Long Biên", "Quận Bắc Từ Liêm", "Quận Nam Từ Liêm", "Huyện Thanh Trì", "Huyện Gia Lâm"],
    pickupPoints: [
      { id: "hn-1", name: "Văn phòng xe Mỹ Đình", address: "Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội", description: "Gần cổng Sân vận động Mỹ Đình", lat: 21.0205, lng: 105.7645 },
      { id: "hn-2", name: "Bến xe Mỹ Đình", address: "Số 20 Phạm Hùng, Nam Từ Liêm, Hà Nội", description: "Bến xe khách Mỹ Đình - cổng chính", lat: 21.0285, lng: 105.7779 },
      { id: "hn-3", name: "Bến xe Giáp Bát", address: "Giải Phóng, Quận Hoàng Mai, Hà Nội", description: "Bến xe khách Giáp Bát", lat: 20.9806, lng: 105.8415 },
      { id: "hn-4", name: "Đại học Bách Khoa Hà Nội", address: "Số 1 Đại Cồ Việt, Quận Hai Bà Trưng, Hà Nội", description: "Cổng chính ĐH Bách Khoa", lat: 21.0055, lng: 105.8432 },
      { id: "hn-5", name: "Ga tàu Hà Nội", address: "120 Lê Duẩn, Quận Hoàn Kiếm, Hà Nội", description: "Trước ga Hà Nội - bãi đỗ xe", lat: 21.0245, lng: 105.8410 },
      { id: "hn-6", name: "Công viên Thống Nhất", address: "Đường Trần Nhân Tông, Quận Hai Bà Trưng, Hà Nội", description: "Cổng chính công viên Thống Nhất", lat: 21.0152, lng: 105.8447 },
      { id: "hn-7", name: "Trạm xăng Petro Minh Khai", address: "458 Minh Khai, Quận Hai Bà Trưng, Hà Nội", description: "Gần Times City", lat: 20.9972, lng: 105.8675 },
      { id: "hn-8", name: "Học viện Ngân hàng", address: "Số 12 Chùa Bộc, Quận Đống Đa, Hà Nội", description: "Cổng trường HV Ngân hàng", lat: 21.0082, lng: 105.8284 },
    ],
  },
  {
    city: "Đà Nẵng",
    cityLabel: "Đà Nẵng",
    center: { lat: 16.0544, lng: 108.2022 },
    districts: ["Quận Hải Châu", "Quận Thanh Khê", "Quận Sơn Trà", "Quận Ngũ Hành Sơn", "Quận Liên Chiểu", "Huyện Hòa Vang", "Huyện Hoàng Sa"],
    pickupPoints: [
      { id: "dn-1", name: "Văn phòng xe Trần Phú", address: "Số 78 Đường Trần Phú, Quận Hải Châu, Đà Nẵng", description: "Gần chợ Cồn", lat: 16.0685, lng: 108.2234 },
      { id: "dn-2", name: "Ga tàu Đà Nẵng", address: "Số 5 Đường Hai Bà Trưng, Quận Hải Châu, Đà Nẵng", description: "Trước cửa ga Đà Nẵng", lat: 16.0718, lng: 108.2140 },
      { id: "dn-3", name: "Bến xe trung tâm Đà Nẵng", address: "Đường Tôn Đức Thắng, Quận Cẩm Lệ, Đà Nẵng", description: "Bến xe khách trung tâm Đà Nẵng", lat: 16.0592, lng: 108.1725 },
      { id: "dn-4", name: "Trường ĐH Bách Khoa Đà Nẵng", address: "54 Nguyễn Lương Bằng, Quận Liên Chiểu, Đà Nẵng", description: "Cổng chính ĐH Bách Khoa", lat: 16.0762, lng: 108.1534 },
      { id: "dn-5", name: "Cầu Thuận Phước", address: "Đường Điện Biên Phủ, Quận Thanh Khê, Đà Nẵng", description: "Chân cầu Thuận Phước - bãi đỗ", lat: 16.0965, lng: 108.2248 },
      { id: "dn-6", name: "Nhà thờ Con Gà Đà Nẵng", address: "156 Đường Trần Phú, Quận Hải Châu, Đà Nẵng", description: "Nhà thờ Đà Nẵng - vỉa hè rộng", lat: 16.0667, lng: 108.2230 },
      { id: "dn-7", name: "Công viên Biển Đông", address: "Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", description: "Công viên Biển Đông - gần cầu Rồng", lat: 16.0677, lng: 108.2460 },
    ],
  },
  {
    city: "Cần Thơ",
    cityLabel: "Cần Thơ",
    center: { lat: 10.0452, lng: 105.7469 },
    districts: ["Quận Ninh Kiều", "Quận Bình Thủy", "Quận Cái Răng", "Quận Thốt Nốt", "Quận Ô Môn", "Huyện Phong Điền", "Huyện Cờ Đỏ", "Huyện Vĩnh Thạnh"],
    pickupPoints: [
      { id: "ct-1", name: "Văn phòng xe Ninh Kiều", address: "Số 28 Đường Nguyễn Đình Chiểu, Quận Ninh Kiều, Cần Thơ", description: "Gần bến Ninh Kiều", lat: 10.0342, lng: 105.7875 },
      { id: "ct-2", name: "Bến xe Cần Thơ", address: "Đường Quang Trung, Quận Cái Răng, Cần Thơ", description: "Bến xe khách Cần Thơ", lat: 10.0154, lng: 105.7628 },
      { id: "ct-3", name: "Bến Ninh Kiều", address: "Bến Ninh Kiều, Quận Ninh Kiều, Cần Thơ", description: "Cảng sông Cần Thơ - nơi tàu cập bến", lat: 10.0336, lng: 105.7892 },
      { id: "ct-4", name: "Trường ĐH Cần Thơ", address: "Khu II, Đường 3/2, Quận Ninh Kiều, Cần Thơ", description: "Cổng chính ĐH Cần Thơ", lat: 10.0305, lng: 105.7689 },
      { id: "ct-5", name: "Trạm xăng Petro Cái Khế", address: "Đường Nguyễn Văn Cừ, Quận Ninh Kiều, Cần Thơ", description: "Cạnh cầu Cái Khế", lat: 10.0468, lng: 105.7852 },
      { id: "ct-6", name: "Vincom Cần Thơ", address: "Đường Hùng Vương, Quận Ninh Kiều, Cần Thơ", description: "Trung tâm thương mại Vincom", lat: 10.0381, lng: 105.7793 },
    ],
  },
  {
    city: "Huế",
    cityLabel: "Huế",
    center: { lat: 16.4637, lng: 107.5909 },
    districts: ["Thành phố Huế", "Huyện Phong Điền", "Huyện Quảng Điền", "Huyện Phú Vang", "Huyện Hương Thủy", "Huyện Hương Trà"],
    pickupPoints: [
      { id: "hue-1", name: "Văn phòng xe Phan Chu Trinh", address: "Số 42 Đường Phan Chu Trinh, TP. Huế", description: "Gần chợ Đông Ba", lat: 16.4632, lng: 107.5905 },
      { id: "hue-2", name: "Bến xe Phía Nam Huế", address: "Đường An Vân, TP. Huế", description: "Bến xe phía Nam thành phố", lat: 16.4421, lng: 107.6015 },
      { id: "hue-3", name: "Cầu Tràng Tiền", address: "Đường Trần Hưng Đạo, TP. Huế", description: "Gần cầu Tràng Tiền", lat: 16.4678, lng: 107.5912 },
      { id: "hue-4", name: "Đại học Huế", address: "Số 22 Lâm Hoằng, TP. Huế", description: "Cổng chính ĐH Huế", lat: 16.4655, lng: 107.5855 },
      { id: "hue-5", name: "Trạm xăng Petro Vỹ Dạ", address: "Đường Vỹ Dạ, TP. Huế", description: "Gần cầu Đông Ba", lat: 16.4712, lng: 107.6085 },
      { id: "hue-6", name: "Sân bay Phú Bài", address: "Xã Phú Bài, Huyện Hương Thủy, Huế", description: "Trước cửa nhà ga sân bay", lat: 16.4005, lng: 107.7025 },
    ],
  },
  {
    city: "Nha Trang",
    cityLabel: "Nha Trang",
    center: { lat: 12.2388, lng: 109.1967 },
    districts: ["Thành phố Nha Trang", "Huyện Ninh Hòa", "Huyện Khánh Vĩnh", "Huyện Diên Khánh", "Huyện Cam Lâm"],
    pickupPoints: [
      { id: "nt-1", name: "Văn phòng xe Trần Phú", address: "Số 1 Đường Trần Phú, TP. Nha Trang", description: "Gần bờ biển Nha Trang", lat: 12.2388, lng: 109.1967 },
      { id: "nt-2", name: "Bến xe Nha Trang", address: "Đường 23/10, TP. Nha Trang", description: "Bến xe khách Nha Trang", lat: 12.2472, lng: 109.1765 },
      { id: "nt-3", name: "Cáp treo Vinpearl Land", address: "Đường Trần Phú kéo dài, TP. Nha Trang", description: "Cổng vào Vinpearl Land", lat: 12.2155, lng: 109.2150 },
      { id: "nt-4", name: "Trường ĐH Nha Trang", address: "02 Nguyễn Đình Chiểu, TP. Nha Trang", description: "Cổng chính ĐH Nha Trang", lat: 12.2682, lng: 109.2023 },
      { id: "nt-5", name: "Tháp Trầm Hương", address: "Đường Trần Phú, TP. Nha Trang", description: "Gần quảng trường 2/4", lat: 12.2415, lng: 109.1958 },
      { id: "nt-6", name: "Trạm xăng Petro Vĩnh Điềm", address: "Vĩnh Điềm Trung, TP. Nha Trang", description: "Đường 23/10", lat: 12.2530, lng: 109.1850 },
    ],
  },
  {
    city: "Vũng Tàu",
    cityLabel: "Vũng Tàu",
    center: { lat: 10.3460, lng: 107.0843 },
    districts: ["Thành phố Vũng Tàu", "Huyện Châu Đức", "Huyện Xuyên Mộc", "Huyện Long Điền", "Huyện Đất Đỏ"],
    pickupPoints: [
      { id: "vt-1", name: "Văn phòng xe Bến xe Vũng Tàu", address: "Số 192 Nam Kỳ Khởi Nghĩa, TP. Vũng Tàu", description: "Bến xe khách Vũng Tàu", lat: 10.3542, lng: 107.0855 },
      { id: "vt-2", name: "Bãi Trước Vũng Tàu", address: "Quang Trung, Bãi Trước, TP. Vũng Tàu", description: "Gần công viên Bãi Trước", lat: 10.3435, lng: 107.0725 },
      { id: "vt-3", name: "Bãi Sau Vũng Tàu", address: "Thùy Vân, Bãi Sau, TP. Vũng Tàu", description: "Khu du lịch Bãi Sau", lat: 10.3392, lng: 107.0915 },
      { id: "vt-4", name: "Cảng tàu Côn Đảo Express", address: "Cảng Cầu Đá, TP. Vũng Tàu", description: "Cảng tàu ra Côn Đảo", lat: 10.3425, lng: 107.0742 },
      { id: "vt-5", name: "Trạm xăng Petro Ba Cu", address: "Đường Ba Cu, TP. Vũng Tàu", description: "Gần trung tâm mua sắm", lat: 10.3498, lng: 107.0795 },
      { id: "vt-6", name: "Ngọn Hải Đăng Vũng Tàu", address: "Núi Nhỏ, Phường 2, TP. Vũng Tàu", description: "Đường lên ngọn hải đăng", lat: 10.3335, lng: 107.0752 },
    ],
  },
  {
    city: "Đà Lạt",
    cityLabel: "Đà Lạt",
    center: { lat: 11.9404, lng: 108.4380 },
    districts: ["Thành phố Đà Lạt", "Huyện Bảo Lâm", "Huyện Đam Rông", "Huyện Lạc Dương", "Huyện Lâm Hà"],
    pickupPoints: [
      { id: "dl-1", name: "Văn phòng xe Đà Lạt", address: "Số 01 Đường Nguyễn Trung Trực, TP. Đà Lạt", description: "Gần chợ Đà Lạt", lat: 11.9404, lng: 108.4380 },
      { id: "dl-2", name: "Bến xe Liên tỉnh Đà Lạt", address: "Số 1 Tô Hiến Thành, TP. Đà Lạt", description: "Bến xe khách Đà Lạt - đèo Prenn", lat: 11.9255, lng: 108.4445 },
      { id: "dl-3", name: "Quảng trường Lâm Viên", address: "Đường Trần Quốc Toản, TP. Đà Lạt", description: "Gần Hồ Xuân Hương - nụ hoa Atiso", lat: 11.9362, lng: 108.4442 },
      { id: "dl-4", name: "Trường ĐH Đà Lạt", address: "Số 1 Đường Phù Đổng Thiên Vương, TP. Đà Lạt", description: "Cổng chính ĐH Đà Lạt", lat: 11.9562, lng: 108.4448 },
      { id: "dl-5", name: "Vườn hoa Thành Phố", address: "Đường Bà Huyện Thanh Quan, TP. Đà Lạt", description: "Cổng vườn hoa Đà Lạt", lat: 11.9485, lng: 108.4520 },
      { id: "dl-6", name: "Go! Đà Lạt (Big C)", address: "Quảng trường Lâm Viên, TP. Đà Lạt", description: "Trước siêu thị Go!", lat: 11.9358, lng: 108.4435 },
    ],
  },
  {
    city: "Hải Phòng",
    cityLabel: "Hải Phòng",
    center: { lat: 20.8449, lng: 106.6881 },
    districts: ["Quận Hồng Bàng", "Quận Lê Chân", "Quận Ngô Quyền", "Quận Kiến An", "Quận Đồ Sơn", "Quận Dương Kinh", "Huyện An Dương", "Huyện Vĩnh Bảo", "Huyện Tiên Lãng"],
    pickupPoints: [
      { id: "hp-1", name: "Văn phòng xe Hải Phòng", address: "Số 18 Đường Lê Lợi, Quận Hồng Bàng, Hải Phòng", description: "Gần chợ Sắt", lat: 20.8625, lng: 106.6805 },
      { id: "hp-2", name: "Bến xe Thượng Lý", address: "Số 52 Hà Nội, Sở Dầu, Quận Hồng Bàng, Hải Phòng", description: "Bến xe khách Thượng Lý", lat: 20.8712, lng: 106.6625 },
      { id: "hp-3", name: "Ga tàu Hải Phòng", address: "Số 75 Lương Khánh Thiện, Quận Ngô Quyền, Hải Phòng", description: "Trước cửa ga Hải Phòng", lat: 20.8572, lng: 106.6852 },
      { id: "hp-4", name: "Bến xe Vĩnh Niệm", address: "Đường Bùi Viện, Quận Lê Chân, Hải Phòng", description: "Bến xe khách mới Vĩnh Niệm", lat: 20.8325, lng: 106.6740 },
      { id: "hp-5", name: "Cảng Hải Phòng", address: "Đường Máy Tơ, Quận Ngô Quyền, Hải Phòng", description: "Gần cảng Hải Phòng", lat: 20.8652, lng: 106.6955 },
      { id: "hp-6", name: "Vincom Plaza Lê Thánh Tông", address: "Số 1 Lê Thánh Tông, Máy Tơ, Ngô Quyền, Hải Phòng", description: "Trung tâm thương mại Vincom", lat: 20.8642, lng: 106.6920 },
    ],
  },
  {
    city: "Quảng Ninh",
    cityLabel: "Quảng Ninh",
    center: { lat: 20.9505, lng: 107.0735 },
    districts: ["Thành phố Hạ Long", "Thành phố Uông Bí", "Thành phố Cẩm Phả", "Thành phố Móng Cái", "Thị xã Quảng Yên", "Huyện Bình Liêu", "Huyện Đầm Hà", "Huyện Hải Hà", "Huyện Tiên Yên", "Huyện Ba Chẽ", "Huyện Vân Đồn"],
    pickupPoints: [
      { id: "qn-1", name: "Văn phòng xe Hạ Long", address: "Số 5 Đường Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh", description: "Gần bến xe Bãi Cháy cũ", lat: 20.9505, lng: 107.0735 },
      { id: "qn-2", name: "Bến xe Bãi Cháy", address: "Số 17 Đường 279, Bãi Cháy, TP. Hạ Long, Quảng Ninh", description: "Bến xe khách Bãi Cháy", lat: 20.9715, lng: 107.0322 },
      { id: "qn-3", name: "Cảng tàu quốc tế Tuần Châu", address: "Đảo Tuần Châu, TP. Hạ Long, Quảng Ninh", description: "Cảng tàu khách quốc tế Tuần Châu", lat: 20.9295, lng: 107.0185 },
      { id: "qn-4", name: "Sun World Hạ Long", address: "Đường Hạ Long, Bãi Cháy, TP. Hạ Long", description: "Trạm cáp treo Nữ Hoàng", lat: 20.9582, lng: 107.0545 },
      { id: "qn-5", name: "Bến xe Móng Cái", address: "Đường Hùng Vương, TP. Móng Cái, Quảng Ninh", description: "Bến xe khách Móng Cái", lat: 21.5285, lng: 107.9652 },
      { id: "qn-6", name: "Cột đồng hồ Hạ Long", address: "Bạch Đằng, Hòn Gai, TP. Hạ Long", description: "Ngã 5 cột đồng hồ", lat: 20.9485, lng: 107.0915 },
    ],
  },
  {
    city: "Bình Dương",
    cityLabel: "Bình Dương",
    center: { lat: 10.9805, lng: 106.6525 },
    districts: ["Thành phố Thủ Dầu Một", "Thị xã Bến Cát", "Thị xã Tân Uyên", "Thành phố Dĩ An", "Thành phố Thuận An", "Huyện Bắc Tân Uyên", "Huyện Phú Giáo", "Huyện Dầu Tiếng"],
    pickupPoints: [
      { id: "bd-1", name: "Văn phòng xe Thủ Dầu Một", address: "Số 88 Đường Cách Mạng Tháng 8, TP. Thủ Dầu Một, Bình Dương", description: "Gần chợ Thủ Dầu Một", lat: 10.9805, lng: 106.6525 },
      { id: "bd-2", name: "Bến xe Bình Dương", address: "Đường 30/4, TP. Thủ Dầu Một, Bình Dương", description: "Bến xe khách tỉnh Bình Dương", lat: 10.9765, lng: 106.6612 },
      { id: "bd-3", name: "KCN Sóng Thần", address: "Đại lộ Độc Lập, Dĩ An, Bình Dương", description: "Cổng KCN Sóng Thần 1", lat: 10.8925, lng: 106.7455 },
      { id: "bd-4", name: "Aeon Mall Bình Dương Canary", address: "Đại lộ Bình Dương, Thuận An, Bình Dương", description: "Cổng F siêu thị Aeon", lat: 10.9322, lng: 106.7085 },
      { id: "bd-5", name: "Bến xe An Phú - Dĩ An", address: "ĐT 743, An Phú, Thuận An, Bình Dương", description: "Vòng xoay An Phú", lat: 10.9455, lng: 106.7325 },
    ],
  },
  {
    city: "Cà Mau",
    cityLabel: "Cà Mau",
    center: { lat: 9.1765, lng: 105.1525 },
    districts: ["Thành phố Cà Mau", "Huyện U Minh", "Huyện Thới Bình", "Huyện Trần Văn Thời", "Huyện Cái Nước", "Huyện Đầm Dơi", "Huyện Ngọc Hiển", "Huyện Năm Căn", "Huyện Phú Tân"],
    pickupPoints: [
      { id: "cm-1", name: "Văn phòng xe Cà Mau", address: "Số 10 Đường Lý Bôn, TP. Cà Mau", description: "Gần chợ Cà Mau", lat: 9.1765, lng: 105.1525 },
      { id: "cm-2", name: "Bến xe Cà Mau", address: "Quốc lộ 1A, Lý Thường Kiệt, TP. Cà Mau", description: "Bến xe khách Cà Mau", lat: 9.1685, lng: 105.1610 },
      { id: "cm-3", name: "Bến xe Năm Căn", address: "Thị trấn Năm Căn, Huyện Năm Căn, Cà Mau", description: "Bến xe trung tâm Năm Căn", lat: 8.7525, lng: 105.0125 },
      { id: "cm-4", name: "Công viên Hùng Vương Cà Mau", address: "Đường Hùng Vương, Phường 5, TP. Cà Mau", description: "Cổng công viên trung tâm", lat: 9.1795, lng: 105.1485 },
      { id: "cm-5", name: "Cột mốc Quốc gia Đất Mũi", address: "Xã Đất Mũi, Huyện Ngọc Hiển, Cà Mau", description: "Khu du lịch Đất Mũi", lat: 8.6095, lng: 104.7215 },
    ],
  },
  {
    city: "An Giang",
    cityLabel: "An Giang",
    center: { lat: 10.3755, lng: 105.4345 },
    districts: ["Thành phố Long Xuyên", "Thành phố Châu Đốc", "Thị xã Tân Châu", "Huyện An Phú", "Huyện Phú Tân", "Huyện Châu Phong", "Huyện Tịnh Biên", "Huyện Tri Tôn", "Huyện Thoại Sơn", "Huyện Châu Thành"],
    pickupPoints: [
      { id: "ag-1", name: "Văn phòng xe Long Xuyên", address: "Số 55 Đường Lê Lợi, TP. Long Xuyên, An Giang", description: "Gần chợ Long Xuyên", lat: 10.3755, lng: 105.4345 },
      { id: "ag-2", name: "Bến xe Long Xuyên", address: "Đường Phạm Cự Lượng, Mỹ Quý, TP. Long Xuyên", description: "Bến xe khách Long Xuyên", lat: 10.3625, lng: 105.4215 },
      { id: "ag-3", name: "Bến xe Châu Đốc", address: "Đường Tôn Đức Thắng, TP. Châu Đốc, An Giang", description: "Bến xe khách Châu Đốc", lat: 10.7025, lng: 105.1155 },
      { id: "ag-4", name: "Miếu Bà Chúa Xứ Núi Sam", address: "Núi Sam, TP. Châu Đốc, An Giang", description: "Cổng Miếu Bà Núi Sam", lat: 10.6812, lng: 105.0785 },
      { id: "ag-5", name: "Phà Tân Châu", address: "Thị xã Tân Châu, An Giang", description: "Khu vực bến phà", lat: 10.8015, lng: 105.2345 },
    ],
  },
  {
    city: "Kiên Giang",
    cityLabel: "Kiên Giang",
    center: { lat: 10.0125, lng: 105.0815 },
    districts: ["Thành phố Rạch Giá", "Thành phố Hà Tiên", "Thị xã Kiên Lương", "Huyện Châu Thành", "Huyện Giồng Giềng", "Huyện Gò Quao", "Huyện Hòn Đất", "Huyện Kiên Hải", "Huyện Nam Du", "Huyện Phú Quốc", "Huyện Tân Hiệp", "Huyện U Minh Thượng", "Huyện Vĩnh Thuận"],
    pickupPoints: [
      { id: "kg-1", name: "Văn phòng xe Rạch Giá", address: "Số 20 Đường Nguyễn Trung Trực, TP. Rạch Giá, Kiên Giang", description: "Gần trung tâm Rạch Giá", lat: 10.0125, lng: 105.0815 },
      { id: "kg-2", name: "Bến xe Rạch Giá", address: "Đường Mai Thị Hồng Hạnh, Rạch Sỏi, TP. Rạch Giá", description: "Bến xe khách Rạch Sỏi", lat: 9.9555, lng: 105.1125 },
      { id: "kg-3", name: "Bến tàu Rạch Giá - Phú Quốc", address: "Đường Nguyễn Công Trứ, Vĩnh Thanh, TP. Rạch Giá", description: "Cảng tàu cao tốc", lat: 10.0185, lng: 105.0725 },
      { id: "kg-4", name: "Cảng tàu Hà Tiên", address: "Kim Dự, TP. Hà Tiên, Kiên Giang", description: "Cảng khách Hà Tiên đi Phú Quốc", lat: 10.3815, lng: 104.4825 },
      { id: "kg-5", name: "Phú Quốc - Trung tâm Dương Đông", address: "Đường 30/4, Phường Dương Đông, TP. Phú Quốc", description: "Khu chợ đêm Dương Đông", lat: 10.2215, lng: 103.9615 },
      { id: "kg-6", name: "Bến xe Hà Tiên", address: "Quốc lộ 80, Tô Châu, TP. Hà Tiên", description: "Bến xe khách Hà Tiên", lat: 10.3755, lng: 104.4912 },
    ],
  },
  {
    city: "Nghệ An",
    cityLabel: "Nghệ An",
    center: { lat: 18.6735, lng: 105.6815 },
    districts: ["Thành phố Vinh", "Thị xã Cửa Lò", "Thị xã Thái Hòa", "Huyện Nghi Lộc", "Huyện Nam Đàn", "Huyện Hưng Nguyên", "Huyện Đô Lương", "Huyện Tân Kỳ", "Huyện Yên Thành", "Huyện Diễn Châu", "Huyện Thanh Chương"],
    pickupPoints: [
      { id: "na-1", name: "Văn phòng xe Vinh", address: "Số 100 Đường Quang Trung, TP. Vinh, Nghệ An", description: "Gần quảng trường Hồ Chí Minh", lat: 18.6735, lng: 105.6815 },
      { id: "na-2", name: "Bến xe Bắc Vinh", address: "Xã Nghi Kim, TP. Vinh, Nghệ An", description: "Bến xe khách mới phía Bắc TP. Vinh", lat: 18.7155, lng: 105.6625 },
      { id: "na-3", name: "Ga tàu Vinh", address: "Số 1 Lê Ninh, Quán Bàu, TP. Vinh, Nghệ An", description: "Trước cửa ga tàu hỏa Vinh", lat: 18.6795, lng: 105.6725 },
      { id: "na-4", name: "Trường ĐH Vinh", address: "Số 182 Đường Lê Duẩn, TP. Vinh, Nghệ An", description: "Cổng chính ĐH Vinh", lat: 18.6585, lng: 105.6945 },
      { id: "na-5", name: "Quảng trường Bình Minh - Cửa Lò", address: "Đường Bình Minh, Thị xã Cửa Lò, Nghệ An", description: "Khu bãi tắm Cửa Lò", lat: 18.8055, lng: 105.7285 },
      { id: "na-6", name: "Khu Di tích Kim Liên", address: "Xã Kim Liên, Huyện Nam Đàn, Nghệ An", description: "Cổng làng Sen quê Bác", lat: 18.7015, lng: 105.5125 },
    ],
  },
];

// Simple location list for backward compatibility (trips search)
export const LOCATIONS: string[] = LOCATION_DATA.map((c) => c.city);

export const normalizeCityName = (city: string): string => {
  if (!city) return "";
  const lower = city.toLowerCase();
  if (
    lower.includes("hà nội") ||
    lower.includes("ha noi") ||
    lower.includes("h├á") ||
    lower.includes("nß╗öi") ||
    lower.includes("n??a????i")
  ) {
    return "Hà Nội";
  }
  if (
    lower.includes("tp.hcm") ||
    lower.includes("hồ chí minh") ||
    lower.includes("ho chi minh") ||
    lower.includes("sài gòn") ||
    lower.includes("sai gon") ||
    lower.includes("hcm")
  ) {
    return "TP.HCM";
  }
  if (
    lower.includes("đà nẵng") ||
    lower.includes("da nang") ||
    lower.includes("n??a??a??ng") ||
    lower.includes("a????a????")
  ) {
    return "Đà Nẵng";
  }
  if (lower.includes("nha trang")) return "Nha Trang";
  if (lower.includes("đà lạt") || lower.includes("da lat")) return "Đà Lạt";
  if (lower.includes("cần thơ") || lower.includes("can tho")) return "Cần Thơ";
  if (lower.includes("hải phòng") || lower.includes("hai phong")) return "Hải Phòng";
  if (lower.includes("quảng ninh") || lower.includes("quang ninh") || lower.includes("hạ long")) return "Quảng Ninh";
  if (lower.includes("bình dương") || lower.includes("binh duong")) return "Bình Dương";
  if (lower.includes("vũng tàu") || lower.includes("vung tau")) return "Vũng Tàu";
  if (lower.includes("cà mau") || lower.includes("ca mau")) return "Cà Mau";
  if (lower.includes("an giang") || lower.includes("an giang")) return "An Giang";
  if (lower.includes("kiên giang") || lower.includes("kien giang")) return "Kiên Giang";
  if (lower.includes("nghệ an") || lower.includes("nghe an") || lower.includes("vinh")) return "Nghệ An";
  return city;
};

export const getCityData = (city: string): CityData | undefined => {
  if (!city) return undefined;
  const exact = LOCATION_DATA.find(
    (c) => c.city.toLowerCase() === city.toLowerCase() || c.cityLabel.toLowerCase() === city.toLowerCase()
  );
  if (exact) return exact;

  const normalized = normalizeCityName(city);
  return LOCATION_DATA.find((c) => c.city === normalized);
};
