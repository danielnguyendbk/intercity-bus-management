-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)

--

-- Host: host.docker.internal    Database: bus_management_db

-- ------------------------------------------------------

-- Server version	8.0.46



/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;

/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;

/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;

/*!50503 SET NAMES utf8mb4 */;

/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;

/*!40103 SET TIME_ZONE='+00:00' */;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;

/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;



--

-- Table structure for table `audit_logs`

--



DROP TABLE IF EXISTS `audit_logs`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `audit_logs` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `user_id` bigint DEFAULT NULL,

  `action` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `record_id` bigint DEFAULT NULL,

  `old_values` json DEFAULT NULL,

  `new_values` json DEFAULT NULL,

  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  KEY `idx_audit_user_id` (`user_id`),

  KEY `idx_audit_table` (`table_name`),

  KEY `idx_audit_timestamp` (`timestamp`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `audit_logs`

--



LOCK TABLES `audit_logs` WRITE;

/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;

/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `buses`

--



DROP TABLE IF EXISTS `buses`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `buses` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `license_plate` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `bus_type` enum('LIMOUSINE','SLEEPER','SEAT') COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `total_seats` int NOT NULL,

  `status` enum('AVAILABLE','RUNNING','MAINTENANCE') COLLATE utf8mb4_unicode_ci DEFAULT 'AVAILABLE',

  `last_maintenance_date` date DEFAULT NULL,

  `insurance_expiry` date DEFAULT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `license_plate` (`license_plate`),

  KEY `idx_buses_status` (`status`),

  KEY `idx_buses_type` (`bus_type`),

  KEY `idx_buses_insurance` (`insurance_expiry`)

) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `buses`

--



LOCK TABLES `buses` WRITE;

/*!40000 ALTER TABLE `buses` DISABLE KEYS */;

INSERT INTO `buses` VALUES (4,'29B-111.11','LIMOUSINE',28,'AVAILABLE',NULL,NULL),(5,'30B-222.22','LIMOUSINE',28,'AVAILABLE',NULL,NULL),(6,'51B-333.33','LIMOUSINE',28,'AVAILABLE',NULL,NULL),(7,'43B-444.44','LIMOUSINE',28,'AVAILABLE',NULL,NULL),(8,'88B-555.55','LIMOUSINE',28,'AVAILABLE',NULL,NULL),(9,'29A-100.01','SLEEPER',34,'AVAILABLE',NULL,NULL),(10,'30A-200.02','SLEEPER',34,'AVAILABLE',NULL,NULL),(11,'51A-300.03','SLEEPER',34,'AVAILABLE',NULL,NULL),(12,'43A-400.04','SLEEPER',34,'AVAILABLE',NULL,NULL),(13,'17A-500.05','SLEEPER',34,'AVAILABLE',NULL,NULL),(14,'29C-1111.1','SLEEPER',40,'AVAILABLE',NULL,NULL),(15,'30C-2222.2','SLEEPER',40,'AVAILABLE',NULL,NULL),(16,'51C-3333.3','SLEEPER',40,'AVAILABLE',NULL,NULL),(17,'72C-4444.4','SLEEPER',40,'AVAILABLE',NULL,NULL),(18,'15C-5555.5','SLEEPER',40,'AVAILABLE',NULL,NULL),(19,'29D-777.77','SEAT',45,'AVAILABLE',NULL,NULL),(20,'30D-888.88','SEAT',45,'AVAILABLE',NULL,NULL),(21,'51D-999.99','SEAT',45,'AVAILABLE',NULL,NULL),(22,'18D-101.10','SEAT',45,'AVAILABLE',NULL,NULL),(23,'16D-202.20','SEAT',45,'AVAILABLE',NULL,NULL),(24,'29E-303.30','SEAT',50,'AVAILABLE',NULL,NULL);

/*!40000 ALTER TABLE `buses` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `cargos`

--



DROP TABLE IF EXISTS `cargos`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `cargos` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `trip_id` bigint NOT NULL,

  `sender_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `receiver_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `receiver_phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,

  `cargo_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `weight` decimal(10,2) DEFAULT NULL,

  `fee` decimal(10,2) NOT NULL,

  `status` enum('PENDING','IN_TRANSIT','DELIVERED','CANCELLED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',

  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  KEY `idx_cargo_trip_id` (`trip_id`),

  KEY `idx_cargo_status` (`status`),

  CONSTRAINT `fk_cargo_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `cargos`

--



LOCK TABLES `cargos` WRITE;

/*!40000 ALTER TABLE `cargos` DISABLE KEYS */;

/*!40000 ALTER TABLE `cargos` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `employees`

--



DROP TABLE IF EXISTS `employees`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `employees` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `user_id` bigint DEFAULT NULL,

  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `hometown` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `experience_years` int DEFAULT NULL,

  `join_date` date DEFAULT NULL,

  `employee_type` enum('DRIVER','ASSISTANT','TECHNICIAN','DISPATCHER','MANAGER') COLLATE utf8mb4_unicode_ci NOT NULL,

  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',

  PRIMARY KEY (`id`),

  KEY `idx_emp_type` (`employee_type`),

  KEY `idx_emp_status` (`status`)

) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `employees`

--



LOCK TABLES `employees` WRITE;

/*!40000 ALTER TABLE `employees` DISABLE KEYS */;

INSERT INTO `employees` VALUES (1,NULL,'Nguyễn Văn An','0904979696',NULL,NULL,NULL,'DRIVER','ACTIVE'),(2,NULL,'Trần Văn Bình','0900733480',NULL,NULL,NULL,'DRIVER','ACTIVE'),(3,NULL,'Lê Đình Cường','0906512597',NULL,NULL,NULL,'DRIVER','ACTIVE'),(4,NULL,'Phạm Văn Dũng','0901127348',NULL,NULL,NULL,'DRIVER','ACTIVE'),(5,NULL,'Hoàng Văn Em','0901579678',NULL,NULL,NULL,'DRIVER','ACTIVE'),(6,NULL,'Đặng Văn Phong','0900128162',NULL,NULL,NULL,'DRIVER','ACTIVE'),(7,NULL,'Bùi Văn Quang','0904824192',NULL,NULL,NULL,'DRIVER','ACTIVE'),(8,NULL,'Đỗ Văn Sơn','0905921545',NULL,NULL,NULL,'DRIVER','ACTIVE'),(9,NULL,'Ngô Văn Tài','0901213957',NULL,NULL,NULL,'DRIVER','ACTIVE'),(10,NULL,'Vũ Văn Thành','0907968456',NULL,NULL,NULL,'DRIVER','ACTIVE'),(11,NULL,'Lý Thị Hương','0916656673',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(12,NULL,'Trương Thị Lan','0911886604',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(13,NULL,'Phan Thị Mai','0918102206',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(14,NULL,'Cao Thị Ngọc','0913028135',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(15,NULL,'Đinh Thị Oanh','0912689936',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(16,NULL,'Hứa Thị Phương','0916111049',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(17,NULL,'Châu Thị Quỳnh','0918487006',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(18,NULL,'Thái Thị Thu','0910506362',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(19,NULL,'Phùng Thị Vy','0911238307',NULL,NULL,NULL,'ASSISTANT','ACTIVE'),(20,NULL,'Đoàn Thị Xinh','0917759707',NULL,NULL,NULL,'ASSISTANT','ACTIVE');

/*!40000 ALTER TABLE `employees` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `feedback_replies`

--



DROP TABLE IF EXISTS `feedback_replies`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `feedback_replies` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `feedback_id` bigint NOT NULL,

  `author_id` bigint NOT NULL,

  `author_role` enum('CUSTOMER','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL,

  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,

  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  KEY `fk_fr_author` (`author_id`),

  KEY `idx_fr_feedback_id` (`feedback_id`),

  CONSTRAINT `fk_fr_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_fr_feedback` FOREIGN KEY (`feedback_id`) REFERENCES `feedbacks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `feedback_replies`

--



LOCK TABLES `feedback_replies` WRITE;

/*!40000 ALTER TABLE `feedback_replies` DISABLE KEYS */;

INSERT INTO `feedback_replies` VALUES (1,1,27,'CUSTOMER','Cam on ban da gop y!','2026-06-27 13:53:56'),(2,1,1,'ADMIN','Cam on quy khach, chung toi se xem xet.','2026-06-27 13:54:10'),(3,6,1,'ADMIN','Cam on quy khach da gop y!','2026-06-27 14:22:42'),(4,1,1,'ADMIN','Test reply after restart','2026-06-27 14:24:44'),(5,7,1,'ADMIN','ok cảm ơn bạn','2026-06-27 14:33:00');

/*!40000 ALTER TABLE `feedback_replies` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `feedbacks`

--



DROP TABLE IF EXISTS `feedbacks`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `feedbacks` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `user_id` bigint NOT NULL,

  `category` enum('COMPLAINT','SUGGESTION','PRAISE','QUESTION','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,

  `subject` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,

  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,

  `related_trip_id` bigint DEFAULT NULL,

  `rating` int DEFAULT NULL,

  `status` enum('NEW','READ','IN_PROGRESS','RESOLVED','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',

  `priority` enum('LOW','MEDIUM','HIGH') COLLATE utf8mb4_unicode_ci DEFAULT 'MEDIUM',

  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,

  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  `deleted_at` datetime DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_fb_user_id` (`user_id`),

  KEY `idx_fb_status` (`status`),

  KEY `idx_fb_priority` (`priority`),

  KEY `idx_fb_created_at` (`created_at`),

  KEY `idx_fb_deleted` (`deleted_at`),

  CONSTRAINT `fk_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `feedbacks`

--



LOCK TABLES `feedbacks` WRITE;

/*!40000 ALTER TABLE `feedbacks` DISABLE KEYS */;

INSERT INTO `feedbacks` VALUES (1,27,'SUGGESTION','test','abc',NULL,5,'IN_PROGRESS','MEDIUM','2026-06-27 13:53:44','2026-06-27 13:54:10',NULL),(2,27,'PRAISE','Test SSE broadcast','Driver rat nhiet tinh, xe sach se',NULL,5,'NEW','MEDIUM','2026-06-27 14:19:53','2026-06-27 14:19:53',NULL),(3,27,'SUGGESTION','SSE real test','Xin chao admin, xin test SSE',NULL,4,'NEW','MEDIUM','2026-06-27 14:20:43','2026-06-27 14:20:43',NULL),(4,27,'QUESTION','Test SSE event broadcast','Toi muon hoi ve gio giac xe',NULL,NULL,'NEW','MEDIUM','2026-06-27 14:21:04','2026-06-27 14:21:04',NULL),(5,27,'COMPLAINT','Real-time test','Di mua 1 tiet bi tre ghe',NULL,3,'NEW','MEDIUM','2026-06-27 14:21:50','2026-06-27 14:21:50',NULL),(6,27,'PRAISE','Filter test with tripId','Test filter by trip',1,5,'RESOLVED','HIGH','2026-06-27 14:22:31','2026-06-27 14:22:42',NULL),(7,6,'SUGGESTION','tài xế hài hước','tôi rất thích anh tài xế này vì tính ảnh hài hước',NULL,5,'IN_PROGRESS','MEDIUM','2026-06-27 14:26:52','2026-06-27 14:33:00',NULL);

/*!40000 ALTER TABLE `feedbacks` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `maintenance`

--



DROP TABLE IF EXISTS `maintenance`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `maintenance` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `bus_id` bigint DEFAULT NULL,

  `description` text COLLATE utf8mb4_unicode_ci,

  `cost` decimal(12,2) DEFAULT NULL,

  `maintenance_date` date DEFAULT NULL,

  `status` enum('SCHEDULED','IN_PROGRESS','COMPLETED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_maint_bus_id` (`bus_id`),

  KEY `idx_maint_status` (`status`),

  KEY `idx_maint_date` (`maintenance_date`),

  CONSTRAINT `fk_maintenance_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `maintenance`

--



LOCK TABLES `maintenance` WRITE;

/*!40000 ALTER TABLE `maintenance` DISABLE KEYS */;

/*!40000 ALTER TABLE `maintenance` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `passengers`

--



DROP TABLE IF EXISTS `passengers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `passengers` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `user_id` bigint DEFAULT NULL,

  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,

  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `id_card` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_pass_user_id` (`user_id`),

  CONSTRAINT `fk_passengers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `passengers`

--



LOCK TABLES `passengers` WRITE;

/*!40000 ALTER TABLE `passengers` DISABLE KEYS */;

INSERT INTO `passengers` VALUES (1,6,'Lê Vũ Hảo','012122199','levuhao10jq@gmail.com',NULL),(2,7,'Lê Vũ Hảo','0901234567','levuhao0jq@gmail.com',NULL),(3,8,'Test Customer','0909123456','test1@test.com',NULL),(5,10,'Test VNPay','','vnpaytest@test.com',NULL),(6,11,'Test VNPay 2','','vnpaytest2@test.com',NULL),(7,12,'Test VNPay','0909123456','testvnpay@test.com',NULL),(8,13,'Test VNPay','','vnpaytest713755559@test.com',NULL),(9,14,'Test VNPay Final','','vnpayfinal1119316318@test.com',NULL),(10,15,'Debug Ticket','0909123456','debugticket128194293@test.com',NULL),(11,16,'VNPay Test User','','vnpaytest_991222128@test.com',NULL),(12,17,'VNPay Test User','','vnpaytest_17051660@test.com',NULL),(13,18,'E2E Test User','','e2e_test_792319231@test.com',NULL),(14,19,'E2E Test User','0909123456','e2e_test_30855355@test.com',NULL),(15,20,'VNPay E2E Test','0909123456','vnpay_e2e_1355490069@test.com',NULL),(16,21,'VNPay E2E Test','0909123456','vnpay_e2e_1677537548@test.com',NULL),(17,22,'VNPay E2E Test','0909123456','vnpay_e2e_1710267283@test.com',NULL),(18,23,'VNPay E2E Test','0909123456','vnpay_e2e_1331741931@test.com',NULL),(19,24,'VNPay E2E Test','0909123456','vnpay_e2e_83775238@test.com',NULL),(20,25,'E2E Test User','0909123456','e2e_test_917587249@test.com',NULL),(21,26,'E2E Trip7','0909123456','e2e_v7_1847038755@test.com',NULL),(22,27,'Nguyễn Văn A','','testfb1@x.com',NULL),(23,28,'nguyn an a','','fseefw@gmail.com',NULL),(24,29,'Demo Customer','','demo@example.com',NULL);

/*!40000 ALTER TABLE `passengers` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `payments`

--



DROP TABLE IF EXISTS `payments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `payments` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `payment_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `ticket_id` bigint DEFAULT NULL,

  `amount` decimal(10,2) NOT NULL,

  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,

  `status` enum('PENDING','SUCCESS','FAILED','REVIEW_REQUIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',

  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `paid_at` datetime DEFAULT NULL,

  `vnp_txn_ref` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `vnp_transaction_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `vnp_bank_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `vnp_card_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `vnp_response_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `sepay_transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `raw_payload` json DEFAULT NULL,

  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `ticket_id` (`ticket_id`),

  UNIQUE KEY `idx_payments_payment_code` (`payment_code`),

  UNIQUE KEY `idx_payments_sepay_txn` (`sepay_transaction_id`),

  KEY `idx_payments_status` (`status`),

  KEY `idx_payments_method` (`payment_method`),

  KEY `idx_payments_vnp_ref` (`vnp_txn_ref`),

  CONSTRAINT `fk_payments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `payments`

--



LOCK TABLES `payments` WRITE;

/*!40000 ALTER TABLE `payments` DISABLE KEYS */;

INSERT INTO `payments` (`id`, `ticket_id`, `amount`, `payment_method`, `status`, `transaction_code`, `paid_at`, `vnp_txn_ref`, `vnp_transaction_no`, `vnp_bank_code`, `vnp_card_type`, `vnp_response_code`) VALUES (2,1,500000.00,'CASH','SUCCESS','CASH-1779204940733','2026-05-19 15:35:41',NULL,NULL,NULL,NULL,NULL),(4,6,300000.00,'CASH','SUCCESS','CASH-1779527854754','2026-05-23 09:17:35',NULL,NULL,NULL,NULL,NULL),(5,8,1000000.00,'CASH','SUCCESS','CASH-1781936173786','2026-06-20 06:16:14',NULL,NULL,NULL,NULL,NULL),(6,11,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET11_1782230339544',NULL,NULL,NULL,NULL),(7,12,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET12_1782231626119',NULL,NULL,NULL,NULL),(8,13,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET13_1782401176869',NULL,NULL,NULL,NULL),(9,14,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET14_1782401879938',NULL,NULL,NULL,NULL),(10,15,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET15_1782404447756',NULL,NULL,NULL,NULL),(11,16,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET16_1782442117898',NULL,NULL,NULL,NULL),(12,17,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET17_1782444732808',NULL,NULL,NULL,NULL),(13,18,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET18_1782445227588',NULL,NULL,NULL,NULL),(14,19,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET19_1782461785792',NULL,NULL,NULL,NULL),(15,20,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET20_1782462793070',NULL,NULL,NULL,NULL),(16,21,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET21_1782463112206',NULL,NULL,NULL,NULL),(17,22,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET22_1782463164021',NULL,NULL,NULL,NULL),(18,23,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET23_1782463534692',NULL,NULL,NULL,NULL),(19,24,1000000.00,'VNPAY','SUCCESS','VNP88888888','2026-06-26 08:50:38','TICKET24_1782463838361','88888888','NCB','ATM','00'),(20,25,1000000.00,'VNPAY','SUCCESS','VNP88888888','2026-06-26 09:26:27','TICKET25_1782465986821','88888888','NCB','ATM','00'),(21,26,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET26_1782466216897',NULL,NULL,NULL,NULL),(22,27,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET27_1782468529000',NULL,NULL,NULL,NULL),(23,28,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET28_1782485968224',NULL,NULL,NULL,NULL),(24,29,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET29_1782520765148',NULL,NULL,NULL,NULL),(25,30,1000000.00,'VNPAY','SUCCESS','VNP87654321','2026-06-27 01:12:17','TICKET30_1782522717324','87654321','NCB','ATM','00'),(26,31,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET31_1782522976142',NULL,NULL,NULL,NULL),(27,32,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET32_1782523567596',NULL,NULL,NULL,NULL),(31,33,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET33_1782524456724',NULL,NULL,NULL,NULL),(32,34,1000000.00,'CASH','SUCCESS','CASH-1782524487746','2026-06-27 01:41:28',NULL,NULL,NULL,NULL,NULL),(33,35,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET35_1782546863527',NULL,NULL,NULL,NULL),(34,36,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET36_1782548381713',NULL,NULL,NULL,NULL),(35,37,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET37_1782549349599',NULL,NULL,NULL,NULL),(36,38,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET38_1782549404846',NULL,NULL,NULL,NULL),(37,39,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET39_1782550492612',NULL,NULL,NULL,NULL),(38,40,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET40_1782551437068',NULL,NULL,NULL,NULL),(39,41,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET41_1782565654697',NULL,NULL,NULL,NULL),(40,42,1000000.00,'VNPAY','PENDING',NULL,NULL,'TICKET42_1782568703766',NULL,NULL,NULL,NULL),(41,43,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET43_1782579717901',NULL,NULL,NULL,NULL),(42,44,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET44_1782631885002',NULL,NULL,NULL,NULL),(43,45,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET45_1782631988732',NULL,NULL,NULL,NULL),(44,46,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET46_1782633049387',NULL,NULL,NULL,NULL),(45,47,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET47_1782633897311',NULL,NULL,NULL,NULL),(46,48,300000.00,'VNPAY','PENDING',NULL,NULL,'TICKET48_1782634027156',NULL,NULL,NULL,NULL),(47,49,300000.00,'VNPAY','SUCCESS','VNP15601903','2026-06-28 08:12:01','TICKET49_1782634292055','15601903','NCB','ATM','00');

/*!40000 ALTER TABLE `payments` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `roles`

--



DROP TABLE IF EXISTS `roles`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `roles` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `description` text COLLATE utf8mb4_unicode_ci,

  PRIMARY KEY (`id`),

  UNIQUE KEY `name` (`name`)

) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `roles`

--



LOCK TABLES `roles` WRITE;

/*!40000 ALTER TABLE `roles` DISABLE KEYS */;

INSERT INTO `roles` VALUES (1,'ADMIN','Administrator with full access'),(3,'CUSTOMER','Customer account');

/*!40000 ALTER TABLE `roles` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `routes`

--



DROP TABLE IF EXISTS `routes`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `routes` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `origin` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `destination` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `distance_km` decimal(10,2) NOT NULL,

  `estimated_duration_min` int NOT NULL,

  `base_price` decimal(10,2) NOT NULL,

  `is_active` tinyint(1) DEFAULT '1',

  PRIMARY KEY (`id`),

  KEY `idx_routes_origin` (`origin`),

  KEY `idx_routes_destination` (`destination`),

  KEY `idx_routes_active` (`is_active`)

) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `routes`

--



LOCK TABLES `routes` WRITE;

/*!40000 ALTER TABLE `routes` DISABLE KEYS */;

INSERT INTO `routes` VALUES (1,'Hà Nội','TP.HCM',1700.00,2400,500000.00,1),(2,'Hà Nội','Đà Nẵng',800.00,1200,300000.00,1),(3,'TP.HCM','Đà Nẵng',900.00,1300,350000.00,1),(5,'Ha Noi','Da Nang',766.00,720,450000.00,1),(6,'TP.HCM','Hà Nội',1000.00,1000,1000000.00,1),(7,'','',0.00,60,300000.00,1);

/*!40000 ALTER TABLE `routes` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `seats`

--



DROP TABLE IF EXISTS `seats`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `seats` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `bus_id` bigint NOT NULL,

  `seat_number` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,

  `position_x` int DEFAULT NULL,

  `position_y` int DEFAULT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_seats_bus_seat` (`bus_id`,`seat_number`),

  UNIQUE KEY `UKrco1j3ocxdux6go8pn6v8fxsm` (`bus_id`,`seat_number`),

  KEY `idx_seats_bus_id` (`bus_id`),

  CONSTRAINT `fk_seats_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=1164 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `seats`

--



LOCK TABLES `seats` WRITE;

/*!40000 ALTER TABLE `seats` DISABLE KEYS */;

INSERT INTO `seats` VALUES (1,4,'A2',1,0),(2,4,'A1',0,0),(3,4,'B2',1,0),(4,4,'B1',0,0),(5,4,'C2',1,0),(6,4,'C1',0,0),(7,4,'D2',1,0),(8,4,'D1',0,0),(9,4,'E2',1,0),(10,4,'E1',0,0),(11,4,'F2',1,0),(12,4,'F1',0,0),(13,4,'G2',1,0),(14,4,'G1',0,0),(15,4,'H2',1,0),(16,4,'H1',0,0),(17,4,'I2',1,0),(18,4,'I1',0,0),(19,4,'J2',1,0),(20,4,'J1',0,0),(21,4,'K2',1,0),(22,4,'K1',0,0),(23,4,'L2',1,0),(24,4,'L1',0,0),(32,5,'A2',1,0),(33,5,'A1',0,0),(34,5,'B2',1,0),(35,5,'B1',0,0),(36,5,'C2',1,0),(37,5,'C1',0,0),(38,5,'D2',1,0),(39,5,'D1',0,0),(40,5,'E2',1,0),(41,5,'E1',0,0),(42,5,'F2',1,0),(43,5,'F1',0,0),(44,5,'G2',1,0),(45,5,'G1',0,0),(46,5,'H2',1,0),(47,5,'H1',0,0),(48,5,'I2',1,0),(49,5,'I1',0,0),(50,5,'J2',1,0),(51,5,'J1',0,0),(52,5,'K2',1,0),(53,5,'K1',0,0),(54,5,'L2',1,0),(55,5,'L1',0,0),(63,6,'A2',1,0),(64,6,'A1',0,0),(65,6,'B2',1,0),(66,6,'B1',0,0),(67,6,'C2',1,0),(68,6,'C1',0,0),(69,6,'D2',1,0),(70,6,'D1',0,0),(71,6,'E2',1,0),(72,6,'E1',0,0),(73,6,'F2',1,0),(74,6,'F1',0,0),(75,6,'G2',1,0),(76,6,'G1',0,0),(77,6,'H2',1,0),(78,6,'H1',0,0),(79,6,'I2',1,0),(80,6,'I1',0,0),(81,6,'J2',1,0),(82,6,'J1',0,0),(83,6,'K2',1,0),(84,6,'K1',0,0),(85,6,'L2',1,0),(86,6,'L1',0,0),(94,7,'A2',1,0),(95,7,'A1',0,0),(96,7,'B2',1,0),(97,7,'B1',0,0),(98,7,'C2',1,0),(99,7,'C1',0,0),(100,7,'D2',1,0),(101,7,'D1',0,0),(102,7,'E2',1,0),(103,7,'E1',0,0),(104,7,'F2',1,0),(105,7,'F1',0,0),(106,7,'G2',1,0),(107,7,'G1',0,0),(108,7,'H2',1,0),(109,7,'H1',0,0),(110,7,'I2',1,0),(111,7,'I1',0,0),(112,7,'J2',1,0),(113,7,'J1',0,0),(114,7,'K2',1,0),(115,7,'K1',0,0),(116,7,'L2',1,0),(117,7,'L1',0,0),(125,8,'A2',1,0),(126,8,'A1',0,0),(127,8,'B2',1,0),(128,8,'B1',0,0),(129,8,'C2',1,0),(130,8,'C1',0,0),(131,8,'D2',1,0),(132,8,'D1',0,0),(133,8,'E2',1,0),(134,8,'E1',0,0),(135,8,'F2',1,0),(136,8,'F1',0,0),(137,8,'G2',1,0),(138,8,'G1',0,0),(139,8,'H2',1,0),(140,8,'H1',0,0),(141,8,'I2',1,0),(142,8,'I1',0,0),(143,8,'J2',1,0),(144,8,'J1',0,0),(145,8,'K2',1,0),(146,8,'K1',0,0),(147,8,'L2',1,0),(148,8,'L1',0,0),(156,9,'A2',1,0),(157,9,'A1',0,0),(158,9,'B2',1,0),(159,9,'B1',0,0),(160,9,'C2',1,0),(161,9,'C1',0,0),(162,9,'D2',1,0),(163,9,'D1',0,0),(164,9,'E2',1,0),(165,9,'E1',0,0),(166,9,'F2',1,0),(167,9,'F1',0,0),(168,9,'G2',1,0),(169,9,'G1',0,0),(170,9,'H2',1,0),(171,9,'H1',0,0),(172,9,'I2',1,0),(173,9,'I1',0,0),(174,9,'J2',1,0),(175,9,'J1',0,0),(176,9,'K2',1,0),(177,9,'K1',0,0),(178,9,'L2',1,0),(179,9,'L1',0,0),(180,9,'M2',1,0),(181,9,'M1',0,0),(182,9,'N2',1,0),(183,9,'N1',0,0),(184,9,'O2',1,0),(185,9,'O1',0,0),(186,9,'P2',1,0),(187,9,'P1',0,0),(188,9,'Q2',1,0),(189,9,'Q1',0,0),(190,9,'R2',1,0),(191,9,'R1',0,0),(219,10,'A2',1,0),(220,10,'A1',0,0),(221,10,'B2',1,0),(222,10,'B1',0,0),(223,10,'C2',1,0),(224,10,'C1',0,0),(225,10,'D2',1,0),(226,10,'D1',0,0),(227,10,'E2',1,0),(228,10,'E1',0,0),(229,10,'F2',1,0),(230,10,'F1',0,0),(231,10,'G2',1,0),(232,10,'G1',0,0),(233,10,'H2',1,0),(234,10,'H1',0,0),(235,10,'I2',1,0),(236,10,'I1',0,0),(237,10,'J2',1,0),(238,10,'J1',0,0),(239,10,'K2',1,0),(240,10,'K1',0,0),(241,10,'L2',1,0),(242,10,'L1',0,0),(243,10,'M2',1,0),(244,10,'M1',0,0),(245,10,'N2',1,0),(246,10,'N1',0,0),(247,10,'O2',1,0),(248,10,'O1',0,0),(249,10,'P2',1,0),(250,10,'P1',0,0),(251,10,'Q2',1,0),(252,10,'Q1',0,0),(253,10,'R2',1,0),(254,10,'R1',0,0),(282,11,'A2',1,0),(283,11,'A1',0,0),(284,11,'B2',1,0),(285,11,'B1',0,0),(286,11,'C2',1,0),(287,11,'C1',0,0),(288,11,'D2',1,0),(289,11,'D1',0,0),(290,11,'E2',1,0),(291,11,'E1',0,0),(292,11,'F2',1,0),(293,11,'F1',0,0),(294,11,'G2',1,0),(295,11,'G1',0,0),(296,11,'H2',1,0),(297,11,'H1',0,0),(298,11,'I2',1,0),(299,11,'I1',0,0),(300,11,'J2',1,0),(301,11,'J1',0,0),(302,11,'K2',1,0),(303,11,'K1',0,0),(304,11,'L2',1,0),(305,11,'L1',0,0),(306,11,'M2',1,0),(307,11,'M1',0,0),(308,11,'N2',1,0),(309,11,'N1',0,0),(310,11,'O2',1,0),(311,11,'O1',0,0),(312,11,'P2',1,0),(313,11,'P1',0,0),(314,11,'Q2',1,0),(315,11,'Q1',0,0),(316,11,'R2',1,0),(317,11,'R1',0,0),(345,12,'A2',1,0),(346,12,'A1',0,0),(347,12,'B2',1,0),(348,12,'B1',0,0),(349,12,'C2',1,0),(350,12,'C1',0,0),(351,12,'D2',1,0),(352,12,'D1',0,0),(353,12,'E2',1,0),(354,12,'E1',0,0),(355,12,'F2',1,0),(356,12,'F1',0,0),(357,12,'G2',1,0),(358,12,'G1',0,0),(359,12,'H2',1,0),(360,12,'H1',0,0),(361,12,'I2',1,0),(362,12,'I1',0,0),(363,12,'J2',1,0),(364,12,'J1',0,0),(365,12,'K2',1,0),(366,12,'K1',0,0),(367,12,'L2',1,0),(368,12,'L1',0,0),(369,12,'M2',1,0),(370,12,'M1',0,0),(371,12,'N2',1,0),(372,12,'N1',0,0),(373,12,'O2',1,0),(374,12,'O1',0,0),(375,12,'P2',1,0),(376,12,'P1',0,0),(377,12,'Q2',1,0),(378,12,'Q1',0,0),(379,12,'R2',1,0),(380,12,'R1',0,0),(408,13,'A2',1,0),(409,13,'A1',0,0),(410,13,'B2',1,0),(411,13,'B1',0,0),(412,13,'C2',1,0),(413,13,'C1',0,0),(414,13,'D2',1,0),(415,13,'D1',0,0),(416,13,'E2',1,0),(417,13,'E1',0,0),(418,13,'F2',1,0),(419,13,'F1',0,0),(420,13,'G2',1,0),(421,13,'G1',0,0),(422,13,'H2',1,0),(423,13,'H1',0,0),(424,13,'I2',1,0),(425,13,'I1',0,0),(426,13,'J2',1,0),(427,13,'J1',0,0),(428,13,'K2',1,0),(429,13,'K1',0,0),(430,13,'L2',1,0),(431,13,'L1',0,0),(432,13,'M2',1,0),(433,13,'M1',0,0),(434,13,'N2',1,0),(435,13,'N1',0,0),(436,13,'O2',1,0),(437,13,'O1',0,0),(438,13,'P2',1,0),(439,13,'P1',0,0),(440,13,'Q2',1,0),(441,13,'Q1',0,0),(442,13,'R2',1,0),(443,13,'R1',0,0),(471,14,'A2',1,0),(472,14,'A1',0,0),(473,14,'B2',1,0),(474,14,'B1',0,0),(475,14,'C2',1,0),(476,14,'C1',0,0),(477,14,'D2',1,0),(478,14,'D1',0,0),(479,14,'E2',1,0),(480,14,'E1',0,0),(481,14,'F2',1,0),(482,14,'F1',0,0),(483,14,'G2',1,0),(484,14,'G1',0,0),(485,14,'H2',1,0),(486,14,'H1',0,0),(487,14,'I2',1,0),(488,14,'I1',0,0),(489,14,'J2',1,0),(490,14,'J1',0,0),(491,14,'K2',1,0),(492,14,'K1',0,0),(493,14,'L2',1,0),(494,14,'L1',0,0),(495,14,'M2',1,0),(496,14,'M1',0,0),(497,14,'N2',1,0),(498,14,'N1',0,0),(499,14,'O2',1,0),(500,14,'O1',0,0),(501,14,'P2',1,0),(502,14,'P1',0,0),(503,14,'Q2',1,0),(504,14,'Q1',0,0),(505,14,'R2',1,0),(506,14,'R1',0,0),(507,14,'S2',1,0),(508,14,'S1',0,0),(509,14,'T2',1,0),(510,14,'T1',0,0),(534,15,'A2',1,0),(535,15,'A1',0,0),(536,15,'B2',1,0),(537,15,'B1',0,0),(538,15,'C2',1,0),(539,15,'C1',0,0),(540,15,'D2',1,0),(541,15,'D1',0,0),(542,15,'E2',1,0),(543,15,'E1',0,0),(544,15,'F2',1,0),(545,15,'F1',0,0),(546,15,'G2',1,0),(547,15,'G1',0,0),(548,15,'H2',1,0),(549,15,'H1',0,0),(550,15,'I2',1,0),(551,15,'I1',0,0),(552,15,'J2',1,0),(553,15,'J1',0,0),(554,15,'K2',1,0),(555,15,'K1',0,0),(556,15,'L2',1,0),(557,15,'L1',0,0),(558,15,'M2',1,0),(559,15,'M1',0,0),(560,15,'N2',1,0),(561,15,'N1',0,0),(562,15,'O2',1,0),(563,15,'O1',0,0),(564,15,'P2',1,0),(565,15,'P1',0,0),(566,15,'Q2',1,0),(567,15,'Q1',0,0),(568,15,'R2',1,0),(569,15,'R1',0,0),(570,15,'S2',1,0),(571,15,'S1',0,0),(572,15,'T2',1,0),(573,15,'T1',0,0),(597,16,'A2',1,0),(598,16,'A1',0,0),(599,16,'B2',1,0),(600,16,'B1',0,0),(601,16,'C2',1,0),(602,16,'C1',0,0),(603,16,'D2',1,0),(604,16,'D1',0,0),(605,16,'E2',1,0),(606,16,'E1',0,0),(607,16,'F2',1,0),(608,16,'F1',0,0),(609,16,'G2',1,0),(610,16,'G1',0,0),(611,16,'H2',1,0),(612,16,'H1',0,0),(613,16,'I2',1,0),(614,16,'I1',0,0),(615,16,'J2',1,0),(616,16,'J1',0,0),(617,16,'K2',1,0),(618,16,'K1',0,0),(619,16,'L2',1,0),(620,16,'L1',0,0),(621,16,'M2',1,0),(622,16,'M1',0,0),(623,16,'N2',1,0),(624,16,'N1',0,0),(625,16,'O2',1,0),(626,16,'O1',0,0),(627,16,'P2',1,0),(628,16,'P1',0,0),(629,16,'Q2',1,0),(630,16,'Q1',0,0),(631,16,'R2',1,0),(632,16,'R1',0,0),(633,16,'S2',1,0),(634,16,'S1',0,0),(635,16,'T2',1,0),(636,16,'T1',0,0),(660,17,'A2',1,0),(661,17,'A1',0,0),(662,17,'B2',1,0),(663,17,'B1',0,0),(664,17,'C2',1,0),(665,17,'C1',0,0),(666,17,'D2',1,0),(667,17,'D1',0,0),(668,17,'E2',1,0),(669,17,'E1',0,0),(670,17,'F2',1,0),(671,17,'F1',0,0),(672,17,'G2',1,0),(673,17,'G1',0,0),(674,17,'H2',1,0),(675,17,'H1',0,0),(676,17,'I2',1,0),(677,17,'I1',0,0),(678,17,'J2',1,0),(679,17,'J1',0,0),(680,17,'K2',1,0),(681,17,'K1',0,0),(682,17,'L2',1,0),(683,17,'L1',0,0),(684,17,'M2',1,0),(685,17,'M1',0,0),(686,17,'N2',1,0),(687,17,'N1',0,0),(688,17,'O2',1,0),(689,17,'O1',0,0),(690,17,'P2',1,0),(691,17,'P1',0,0),(692,17,'Q2',1,0),(693,17,'Q1',0,0),(694,17,'R2',1,0),(695,17,'R1',0,0),(696,17,'S2',1,0),(697,17,'S1',0,0),(698,17,'T2',1,0),(699,17,'T1',0,0),(723,18,'A2',1,0),(724,18,'A1',0,0),(725,18,'B2',1,0),(726,18,'B1',0,0),(727,18,'C2',1,0),(728,18,'C1',0,0),(729,18,'D2',1,0),(730,18,'D1',0,0),(731,18,'E2',1,0),(732,18,'E1',0,0),(733,18,'F2',1,0),(734,18,'F1',0,0),(735,18,'G2',1,0),(736,18,'G1',0,0),(737,18,'H2',1,0),(738,18,'H1',0,0),(739,18,'I2',1,0),(740,18,'I1',0,0),(741,18,'J2',1,0),(742,18,'J1',0,0),(743,18,'K2',1,0),(744,18,'K1',0,0),(745,18,'L2',1,0),(746,18,'L1',0,0),(747,18,'M2',1,0),(748,18,'M1',0,0),(749,18,'N2',1,0),(750,18,'N1',0,0),(751,18,'O2',1,0),(752,18,'O1',0,0),(753,18,'P2',1,0),(754,18,'P1',0,0),(755,18,'Q2',1,0),(756,18,'Q1',0,0),(757,18,'R2',1,0),(758,18,'R1',0,0),(759,18,'S2',1,0),(760,18,'S1',0,0),(761,18,'T2',1,0),(762,18,'T1',0,0),(786,19,'A3',2,0),(787,19,'A2',1,0),(788,19,'A1',0,0),(789,19,'B3',2,0),(790,19,'B2',1,0),(791,19,'B1',0,0),(792,19,'C3',2,0),(793,19,'C2',1,0),(794,19,'C1',0,0),(795,19,'D3',2,0),(796,19,'D2',1,0),(797,19,'D1',0,0),(798,19,'E3',2,0),(799,19,'E2',1,0),(800,19,'E1',0,0),(801,19,'F3',2,0),(802,19,'F2',1,0),(803,19,'F1',0,0),(804,19,'G3',2,0),(805,19,'G2',1,0),(806,19,'G1',0,0),(807,19,'H3',2,0),(808,19,'H2',1,0),(809,19,'H1',0,0),(810,19,'I3',2,0),(811,19,'I2',1,0),(812,19,'I1',0,0),(813,19,'J3',2,0),(814,19,'J2',1,0),(815,19,'J1',0,0),(816,19,'K3',2,0),(817,19,'K2',1,0),(818,19,'K1',0,0),(819,19,'L3',2,0),(820,19,'L2',1,0),(821,19,'L1',0,0),(822,19,'M3',2,0),(823,19,'M2',1,0),(824,19,'M1',0,0),(825,19,'N3',2,0),(826,19,'N2',1,0),(827,19,'N1',0,0),(828,19,'O3',2,0),(829,19,'O2',1,0),(830,19,'O1',0,0),(849,20,'A3',2,0),(850,20,'A2',1,0),(851,20,'A1',0,0),(852,20,'B3',2,0),(853,20,'B2',1,0),(854,20,'B1',0,0),(855,20,'C3',2,0),(856,20,'C2',1,0),(857,20,'C1',0,0),(858,20,'D3',2,0),(859,20,'D2',1,0),(860,20,'D1',0,0),(861,20,'E3',2,0),(862,20,'E2',1,0),(863,20,'E1',0,0),(864,20,'F3',2,0),(865,20,'F2',1,0),(866,20,'F1',0,0),(867,20,'G3',2,0),(868,20,'G2',1,0),(869,20,'G1',0,0),(870,20,'H3',2,0),(871,20,'H2',1,0),(872,20,'H1',0,0),(873,20,'I3',2,0),(874,20,'I2',1,0),(875,20,'I1',0,0),(876,20,'J3',2,0),(877,20,'J2',1,0),(878,20,'J1',0,0),(879,20,'K3',2,0),(880,20,'K2',1,0),(881,20,'K1',0,0),(882,20,'L3',2,0),(883,20,'L2',1,0),(884,20,'L1',0,0),(885,20,'M3',2,0),(886,20,'M2',1,0),(887,20,'M1',0,0),(888,20,'N3',2,0),(889,20,'N2',1,0),(890,20,'N1',0,0),(891,20,'O3',2,0),(892,20,'O2',1,0),(893,20,'O1',0,0),(912,21,'A3',2,0),(913,21,'A2',1,0),(914,21,'A1',0,0),(915,21,'B3',2,0),(916,21,'B2',1,0),(917,21,'B1',0,0),(918,21,'C3',2,0),(919,21,'C2',1,0),(920,21,'C1',0,0),(921,21,'D3',2,0),(922,21,'D2',1,0),(923,21,'D1',0,0),(924,21,'E3',2,0),(925,21,'E2',1,0),(926,21,'E1',0,0),(927,21,'F3',2,0),(928,21,'F2',1,0),(929,21,'F1',0,0),(930,21,'G3',2,0),(931,21,'G2',1,0),(932,21,'G1',0,0),(933,21,'H3',2,0),(934,21,'H2',1,0),(935,21,'H1',0,0),(936,21,'I3',2,0),(937,21,'I2',1,0),(938,21,'I1',0,0),(939,21,'J3',2,0),(940,21,'J2',1,0),(941,21,'J1',0,0),(942,21,'K3',2,0),(943,21,'K2',1,0),(944,21,'K1',0,0),(945,21,'L3',2,0),(946,21,'L2',1,0),(947,21,'L1',0,0),(948,21,'M3',2,0),(949,21,'M2',1,0),(950,21,'M1',0,0),(951,21,'N3',2,0),(952,21,'N2',1,0),(953,21,'N1',0,0),(954,21,'O3',2,0),(955,21,'O2',1,0),(956,21,'O1',0,0),(975,22,'A3',2,0),(976,22,'A2',1,0),(977,22,'A1',0,0),(978,22,'B3',2,0),(979,22,'B2',1,0),(980,22,'B1',0,0),(981,22,'C3',2,0),(982,22,'C2',1,0),(983,22,'C1',0,0),(984,22,'D3',2,0),(985,22,'D2',1,0),(986,22,'D1',0,0),(987,22,'E3',2,0),(988,22,'E2',1,0),(989,22,'E1',0,0),(990,22,'F3',2,0),(991,22,'F2',1,0),(992,22,'F1',0,0),(993,22,'G3',2,0),(994,22,'G2',1,0),(995,22,'G1',0,0),(996,22,'H3',2,0),(997,22,'H2',1,0),(998,22,'H1',0,0),(999,22,'I3',2,0),(1000,22,'I2',1,0),(1001,22,'I1',0,0),(1002,22,'J3',2,0),(1003,22,'J2',1,0),(1004,22,'J1',0,0),(1005,22,'K3',2,0),(1006,22,'K2',1,0),(1007,22,'K1',0,0),(1008,22,'L3',2,0),(1009,22,'L2',1,0),(1010,22,'L1',0,0),(1011,22,'M3',2,0),(1012,22,'M2',1,0),(1013,22,'M1',0,0),(1014,22,'N3',2,0),(1015,22,'N2',1,0),(1016,22,'N1',0,0),(1017,22,'O3',2,0),(1018,22,'O2',1,0),(1019,22,'O1',0,0),(1038,23,'A3',2,0),(1039,23,'A2',1,0),(1040,23,'A1',0,0),(1041,23,'B3',2,0),(1042,23,'B2',1,0),(1043,23,'B1',0,0),(1044,23,'C3',2,0),(1045,23,'C2',1,0),(1046,23,'C1',0,0),(1047,23,'D3',2,0),(1048,23,'D2',1,0),(1049,23,'D1',0,0),(1050,23,'E3',2,0),(1051,23,'E2',1,0),(1052,23,'E1',0,0),(1053,23,'F3',2,0),(1054,23,'F2',1,0),(1055,23,'F1',0,0),(1056,23,'G3',2,0),(1057,23,'G2',1,0),(1058,23,'G1',0,0),(1059,23,'H3',2,0),(1060,23,'H2',1,0),(1061,23,'H1',0,0),(1062,23,'I3',2,0),(1063,23,'I2',1,0),(1064,23,'I1',0,0),(1065,23,'J3',2,0),(1066,23,'J2',1,0),(1067,23,'J1',0,0),(1068,23,'K3',2,0),(1069,23,'K2',1,0),(1070,23,'K1',0,0),(1071,23,'L3',2,0),(1072,23,'L2',1,0),(1073,23,'L1',0,0),(1074,23,'M3',2,0),(1075,23,'M2',1,0),(1076,23,'M1',0,0),(1077,23,'N3',2,0),(1078,23,'N2',1,0),(1079,23,'N1',0,0),(1080,23,'O3',2,0),(1081,23,'O2',1,0),(1082,23,'O1',0,0),(1101,24,'A3',2,0),(1102,24,'A2',1,0),(1103,24,'A1',0,0),(1104,24,'B3',2,0),(1105,24,'B2',1,0),(1106,24,'B1',0,0),(1107,24,'C3',2,0),(1108,24,'C2',1,0),(1109,24,'C1',0,0),(1110,24,'D3',2,0),(1111,24,'D2',1,0),(1112,24,'D1',0,0),(1113,24,'E3',2,0),(1114,24,'E2',1,0),(1115,24,'E1',0,0),(1116,24,'F3',2,0),(1117,24,'F2',1,0),(1118,24,'F1',0,0),(1119,24,'G3',2,0),(1120,24,'G2',1,0),(1121,24,'G1',0,0),(1122,24,'H3',2,0),(1123,24,'H2',1,0),(1124,24,'H1',0,0),(1125,24,'I3',2,0),(1126,24,'I2',1,0),(1127,24,'I1',0,0),(1128,24,'J3',2,0),(1129,24,'J2',1,0),(1130,24,'J1',0,0),(1131,24,'K3',2,0),(1132,24,'K2',1,0),(1133,24,'K1',0,0),(1134,24,'L3',2,0),(1135,24,'L2',1,0),(1136,24,'L1',0,0),(1137,24,'M3',2,0),(1138,24,'M2',1,0),(1139,24,'M1',0,0),(1140,24,'N3',2,0),(1141,24,'N2',1,0),(1142,24,'N1',0,0),(1143,24,'O3',2,0),(1144,24,'O2',1,0),(1145,24,'O1',0,0),(1146,24,'P3',2,0),(1147,24,'P2',1,0),(1148,24,'P1',0,0);

/*!40000 ALTER TABLE `seats` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `tickets`

--



DROP TABLE IF EXISTS `tickets`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `tickets` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `trip_id` bigint DEFAULT NULL,

  `seat_id` bigint DEFAULT NULL,

  `passenger_id` bigint DEFAULT NULL,

  `price` decimal(10,2) NOT NULL,

  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,

  `booked_by` bigint DEFAULT NULL,

  `booked_at` datetime DEFAULT CURRENT_TIMESTAMP,

  `paid_at` datetime DEFAULT NULL,

  `pickup_point` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `dropoff_point` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_tickets_trip_seat` (`trip_id`,`seat_id`),

  UNIQUE KEY `UK3twtt65sojd8vyfh7yrkw4gub` (`trip_id`,`seat_id`),

  KEY `fk_tickets_passenger` (`passenger_id`),

  KEY `idx_tickets_trip_id` (`trip_id`),

  KEY `idx_tickets_seat_id` (`seat_id`),

  KEY `idx_tickets_status` (`status`),

  KEY `idx_tickets_booked_by` (`booked_by`),

  KEY `idx_tickets_paid` (`paid_at`),

  CONSTRAINT `fk_tickets_booked_by` FOREIGN KEY (`booked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_tickets_passenger` FOREIGN KEY (`passenger_id`) REFERENCES `passengers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_tickets_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_tickets_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `tickets`

--



LOCK TABLES `tickets` WRITE;

/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;

INSERT INTO `tickets` VALUES (1,2,128,1,500000.00,'CONFIRMED',6,'2026-05-04 17:06:10','2026-05-19 15:35:41',NULL,NULL),(5,5,166,1,300000.00,'HOLD',6,'2026-05-21 08:55:56',NULL,NULL,NULL),(6,5,167,1,300000.00,'CONFIRMED',6,'2026-05-21 09:11:10','2026-05-23 09:17:35',NULL,NULL),(7,5,168,1,300000.00,'HOLD',6,'2026-05-28 06:59:09',NULL,NULL,NULL),(8,6,206,20,1000000.00,'HOLD',25,'2026-06-27 08:26:35',NULL,'Ben xe Mien Dong - 05 Dien Bien Phu','Ben xe Trung tam Da Nang - 201 Tran Phu'),(9,6,207,1,1000000.00,'HOLD',6,'2026-06-20 06:54:04',NULL,'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(10,6,208,1,1000000.00,'HOLD',6,'2026-06-23 15:54:39',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Ga tàu Hà Nội - Quận Hoàn Kiếm, Hà Nội'),(11,6,209,1,1000000.00,'HOLD',6,'2026-06-23 15:58:59',NULL,'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM','Đại học Bách Khoa Hà Nội - Số 1 Đại Cồ Việt, Quận Hai Bà Trưng, Hà Nội'),(12,6,210,1,1000000.00,'HOLD',6,'2026-06-23 16:20:26',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(13,6,211,1,1000000.00,'HOLD',6,'2026-06-25 15:26:17',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),(14,6,212,1,1000000.00,'HOLD',6,'2026-06-25 15:38:00',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(15,6,213,1,1000000.00,'HOLD',6,'2026-06-25 16:20:48',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(16,6,214,1,1000000.00,'HOLD',6,'2026-06-26 02:48:38',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(17,6,215,1,1000000.00,'HOLD',6,'2026-06-26 03:32:13',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Ga tàu Hà Nội - Quận Hoàn Kiếm, Hà Nội'),(18,6,216,1,1000000.00,'HOLD',6,'2026-06-26 03:40:28',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(19,6,217,14,1000000.00,'HOLD',19,'2026-06-26 08:16:26',NULL,'Ben xe Mien Dong - 05 Dien Bien Phu','Ben xe Trung tam Da Nang - 201 Tran Phu'),(20,6,218,1,1000000.00,'HOLD',6,'2026-06-26 08:33:13',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Công viên Thống Nhất - Đường Trần Nhân Tông, Quận Hai Bà Trưng, Hà Nội'),(21,6,219,15,1000000.00,'HOLD',20,'2026-06-26 08:38:32',NULL,'Ben xe Mien Dong','Ben xe Da Nang'),(22,6,220,16,1000000.00,'HOLD',21,'2026-06-26 08:39:24',NULL,'Ben xe Mien Dong','Ben xe Da Nang'),(23,6,221,17,1000000.00,'HOLD',22,'2026-06-26 08:45:35',NULL,'Ben xe Mien Dong','Ben xe Da Nang'),(24,6,222,18,1000000.00,'PAID',23,'2026-06-26 08:50:38','2026-06-26 08:50:38','Ben xe Mien Dong','Ben xe Da Nang'),(25,6,223,19,1000000.00,'PAID',24,'2026-06-26 09:26:27','2026-06-26 09:26:27','Ben xe Mien Dong','Ben xe Da Nang'),(26,6,224,1,1000000.00,'HOLD',6,'2026-06-26 09:30:17',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(27,6,225,1,1000000.00,'HOLD',6,'2026-06-26 10:08:49',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(28,6,226,1,1000000.00,'HOLD',6,'2026-06-26 14:59:28',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(29,6,227,1,1000000.00,'HOLD',6,'2026-06-27 00:39:25',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(30,6,228,1,1000000.00,'PAID',6,'2026-06-27 01:11:34','2026-06-27 01:12:17','Ben xe Mien Dong','Ben xe My Dinh'),(31,6,229,1,1000000.00,'CONFIRMED',6,'2026-06-27 01:16:16','2026-06-27 02:04:43','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(32,6,230,1,1000000.00,'CONFIRMED',6,'2026-06-27 01:26:07','2026-06-27 02:03:07','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(33,6,231,2,1000000.00,'CONFIRMED',7,'2026-06-27 01:40:57','2026-06-27 01:40:57',NULL,NULL),(34,6,232,2,1000000.00,'CONFIRMED',7,'2026-06-27 01:41:28','2026-06-27 01:41:28',NULL,NULL),(35,6,233,1,1000000.00,'CONFIRMED',6,'2026-06-27 07:54:23','2026-06-27 08:15:42','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(36,7,318,1,1000000.00,'HOLD',6,'2026-06-27 08:19:42',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(37,7,319,1,1000000.00,'HOLD',6,'2026-06-27 08:35:50',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(38,7,320,1,1000000.00,'HOLD',6,'2026-06-27 08:36:45',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),(39,7,321,1,1000000.00,'CONFIRMED',6,'2026-06-27 08:54:52','2026-06-27 15:11:57','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),(40,7,322,1,1000000.00,'CONFIRMED',6,'2026-06-27 09:10:37','2026-06-27 14:25:01','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Bến xe Giáp Bát - Giáp Bát, Quận Hoàng Mai, Hà Nội'),(41,7,323,1,1000000.00,'CONFIRMED',6,'2026-06-27 13:07:35','2026-06-27 13:09:00','Nhà hàng Bạch Kỳ - Lăng Cả - Số 58bis Lê Thánh Tôn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(42,7,324,1,1000000.00,'CONFIRMED',6,'2026-06-27 13:58:24','2026-06-27 14:24:50','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(43,8,636,1,300000.00,'CONFIRMED',6,'2026-06-27 17:01:58','2026-06-27 17:03:03','Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(44,8,637,1,300000.00,'HOLD',6,'2026-06-28 07:31:25',NULL,'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(45,8,638,1,300000.00,'HOLD',6,'2026-06-28 07:33:09',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(46,8,639,1,300000.00,'HOLD',6,'2026-06-28 07:50:49',NULL,'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(47,8,640,1,300000.00,'HOLD',6,'2026-06-28 08:04:57',NULL,'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM','Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),(48,8,641,1,300000.00,'HOLD',6,'2026-06-28 08:07:07',NULL,'Trạm xăng Petro Đinh Tiên Hoàng - Đinh Tiên Hoàng, Quận 1, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),(49,8,648,1,300000.00,'PAID',6,'2026-06-28 08:11:32','2026-06-28 08:12:01','Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM','Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội');

/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `trip_assignments`

--



DROP TABLE IF EXISTS `trip_assignments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `trip_assignments` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `trip_id` bigint NOT NULL,

  `employee_id` bigint NOT NULL,

  `assignment_role` enum('DRIVER','ASSISTANT') COLLATE utf8mb4_unicode_ci NOT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_ta_trip_employee_role` (`trip_id`,`employee_id`,`assignment_role`),

  KEY `idx_ta_trip_id` (`trip_id`),

  KEY `idx_ta_employee_id` (`employee_id`)

) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `trip_assignments`

--



LOCK TABLES `trip_assignments` WRITE;

/*!40000 ALTER TABLE `trip_assignments` DISABLE KEYS */;

INSERT INTO `trip_assignments` VALUES (11,1,6,'DRIVER'),(12,1,18,'ASSISTANT'),(9,2,1,'DRIVER'),(10,2,11,'ASSISTANT'),(13,3,7,'DRIVER'),(14,3,18,'ASSISTANT'),(5,4,4,'DRIVER'),(6,4,17,'ASSISTANT'),(7,5,8,'DRIVER'),(8,5,19,'ASSISTANT'),(15,6,8,'DRIVER'),(16,6,16,'ASSISTANT'),(17,7,6,'DRIVER'),(18,7,19,'ASSISTANT'),(19,8,8,'DRIVER'),(20,8,20,'ASSISTANT');

/*!40000 ALTER TABLE `trip_assignments` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `trips`

--



DROP TABLE IF EXISTS `trips`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `trips` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `route_id` bigint DEFAULT NULL,

  `bus_id` bigint DEFAULT NULL,

  `departure_time` datetime NOT NULL,

  `arrival_time` datetime DEFAULT NULL,

  `status` enum('SCHEDULED','RUNNING','COMPLETED','CANCELLED','DELAYED') COLLATE utf8mb4_unicode_ci DEFAULT 'SCHEDULED',

  `actual_departure` datetime DEFAULT NULL,

  `actual_arrival` datetime DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_trips_route_id` (`route_id`),

  KEY `idx_trips_bus_id` (`bus_id`),

  KEY `idx_trips_departure` (`departure_time`),

  KEY `idx_trips_status` (`status`),

  KEY `idx_trips_route_status` (`route_id`,`status`,`departure_time`),

  CONSTRAINT `fk_trips_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_trips_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `trips`

--



LOCK TABLES `trips` WRITE;

/*!40000 ALTER TABLE `trips` DISABLE KEYS */;

INSERT INTO `trips` VALUES (1,1,15,'2026-05-10 01:00:00','2026-05-10 13:00:00','SCHEDULED',NULL,NULL),(2,1,4,'2026-05-05 16:32:00','2026-05-06 16:32:00','SCHEDULED',NULL,NULL),(3,5,4,'2026-05-20 01:00:00','2026-05-20 13:00:00','SCHEDULED',NULL,NULL),(4,6,8,'2026-05-30 15:41:00','2026-06-01 15:41:00','SCHEDULED',NULL,NULL),(5,2,18,'2026-06-01 08:54:00','2026-06-02 08:54:00','SCHEDULED',NULL,NULL),(6,6,4,'2026-06-30 08:32:00','2026-07-02 08:32:00','SCHEDULED',NULL,NULL),(7,6,8,'2026-07-02 08:16:00','2026-07-04 08:16:00','SCHEDULED',NULL,NULL),(8,7,17,'2026-06-28 15:08:00','2026-06-30 15:08:00','SCHEDULED',NULL,NULL);

/*!40000 ALTER TABLE `trips` ENABLE KEYS */;

UNLOCK TABLES;



--

-- Table structure for table `users`

--



DROP TABLE IF EXISTS `users`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!50503 SET character_set_client = utf8mb4 */;

CREATE TABLE `users` (

  `id` bigint NOT NULL AUTO_INCREMENT,

  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,

  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `role_id` bigint DEFAULT NULL,

  `status` enum('ACTIVE','INACTIVE','LOCKED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',

  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  UNIQUE KEY `username` (`username`),

  UNIQUE KEY `email` (`email`),

  KEY `idx_users_role_id` (`role_id`),

  KEY `idx_users_status` (`status`),

  KEY `idx_users_email` (`email`),

  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;



--

-- Dumping data for table `users`

--



LOCK TABLES `users` WRITE;

/*!40000 ALTER TABLE `users` DISABLE KEYS */;

INSERT INTO `users` VALUES (1,'admin','$2a$10$ewiFcmoi3yZG1OC0oACVZOZk2QemE3igaVorFpabpJ.PqZp.CAE5m','admin@bus.com',NULL,1,'ACTIVE','2026-05-04 07:02:29'),(6,'levuhao10jq@gmail.com','$2a$10$R.V8LjVTg7k6NuReyxBGYONOxWBuK2xaS6cXSQ9OSVxaWJCmR1O0m','levuhao10jq@gmail.com',NULL,3,'ACTIVE','2026-05-04 16:31:20'),(7,'levuhao','$2a$10$bh.z8jtPIBoiUg/fBlZQMOWZmy/mUS7Nvlk1OYm4xlc0ICjGRngkW','levuhao0jq@gmail.com',NULL,3,'ACTIVE','2026-05-19 16:01:11'),(8,'testuser1','$2a$10$x/HtBJ0trE77GenFKBHATuQJJcZX9BlO9MggJ3jCx4bLV1eOu6HCK','test1@test.com',NULL,3,'ACTIVE','2026-05-21 08:41:51'),(10,'vnpaytest','$2a$10$3gY6Y2Ttr9Kn0LoA4iGCH.CpuAtEthhcrMNaPeKxcuAwT0SGp/aBm','vnpaytest@test.com',NULL,3,'ACTIVE','2026-06-25 17:33:05'),(11,'vnpaytest2','$2a$10$CXzho5uC7d/IPQXgBgGFA.ZH6Q9Ed.MpCsaHA9XCX7Htig.Ji9fyO','vnpaytest2@test.com',NULL,3,'ACTIVE','2026-06-25 17:33:16'),(12,'testvnpay','$2a$10$wxDzDcBzIP2mzBCUZp.Xy.TAC8dzmuzcoTH0EhdCI2zGmtjsB7TnO','testvnpay@test.com',NULL,3,'ACTIVE','2026-06-25 17:36:39'),(13,'vnpaytest1307403650','$2a$10$xkthvmSgmlUGlbzT9b.K1eBo92dM/j/k4RsxVEHaiDBh4mZYyjkIu','vnpaytest713755559@test.com',NULL,3,'ACTIVE','2026-06-25 17:36:52'),(14,'vnpayfinal1326988457','$2a$10$qEhSiHFa9f69yjP8KeKCCOZ/UzkAFvA4GPxuP9r63ZgAGPYeIy6F.','vnpayfinal1119316318@test.com',NULL,3,'ACTIVE','2026-06-25 17:37:03'),(15,'debugticket1413512757','$2a$10$i2lEcmx1Ix3/Bx4WJp4nT.b8EY1gTPk9TES4G4hzJ85hcdKaIWNKi','debugticket128194293@test.com',NULL,3,'ACTIVE','2026-06-25 17:37:15'),(16,'vnpaytest_824290894','$2a$10$l8JE1CoVtX/XQRFmO5KdVOzuwaZpdOAcW.tpIXODyvTYkBc5nl4da','vnpaytest_991222128@test.com',NULL,3,'ACTIVE','2026-06-26 08:11:38'),(17,'vnpaytest_244666857','$2a$10$ZXFcrPp9PmNSZhe7mQ2LPuri1G2ALH70ZPcNzO4l0Kruu2ev.FOKy','vnpaytest_17051660@test.com',NULL,3,'ACTIVE','2026-06-26 08:14:19'),(18,'e2e_test_1743746485','$2a$10$M6BiHewB.YDpx4QQ/bpwF.kolqb4qyqpW1je.VzxueUTxIsrKCHLi','e2e_test_792319231@test.com',NULL,3,'ACTIVE','2026-06-26 08:15:11'),(19,'e2e_test_379217453','$2a$10$9vzFtOnNTy896Ipu1AdPcORs4lVkvfOUo0KW.2wdDBr5yLrwsfl3e','e2e_test_30855355@test.com',NULL,3,'ACTIVE','2026-06-26 08:16:26'),(20,'vnpay_e2e_1355490069','$2a$10$yiVSdJlBREcWIRaDcOir5.p2dsiHnwavYPCZKNjSjwAWdro9mZ5de','vnpay_e2e_1355490069@test.com',NULL,3,'ACTIVE','2026-06-26 08:38:32'),(21,'vnpay_e2e_1677537548','$2a$10$ITNPH3YoNW8i2AAL9qD2iuNeKe.9oMhUcskTlwI8UIXz2v3pdqFdO','vnpay_e2e_1677537548@test.com',NULL,3,'ACTIVE','2026-06-26 08:39:24'),(22,'vnpay_e2e_1710267283','$2a$10$RfERGCyP6Y29FuUWlFYQze4gKQqtHKCZB45JUzb1jijzD3rveY2au','vnpay_e2e_1710267283@test.com',NULL,3,'ACTIVE','2026-06-26 08:45:34'),(23,'vnpay_e2e_1331741931','$2a$10$Ne68xglYnHaEHNmhP/wqc.T0zMyICiU6ErqW5Tob3CplMA6K/skIi','vnpay_e2e_1331741931@test.com',NULL,3,'ACTIVE','2026-06-26 08:50:38'),(24,'vnpay_e2e_83775238','$2a$10$c9qGuzFMzkwsx03JVHqoouHcYceIoB7PgAo/ZpNUZ7QWa3vaKphHW','vnpay_e2e_83775238@test.com',NULL,3,'ACTIVE','2026-06-26 09:26:27'),(25,'e2e_test_1202842682','$2a$10$VajtNzpq8GheCSgLUhUM3eH7rFd1DuFi4PUPTHBYgDzUYJQmWi.BC','e2e_test_917587249@test.com',NULL,3,'ACTIVE','2026-06-27 08:26:35'),(26,'e2e_v7_242206309','$2a$10$/6MZK.S5DaJBxA0UhbMLAe7sTrw4V32BYt1csefiYMr1ATk1Wih9C','e2e_v7_1847038755@test.com',NULL,3,'ACTIVE','2026-06-27 08:30:20'),(27,'testfeedback1','$2a$10$JHz3IouiO/wyZdX2hQNDsu14D46OgoPgqLfSevuFLmx85P0lCZ/wW','testfb1@x.com',NULL,3,'ACTIVE','2026-06-27 13:53:11'),(28,'ewffefer','$2a$10$hxazY1qLzyvsRweluf.LMeCPlVQGVxmNzBblHNzd0BQgSH2nqlUdG','fseefw@gmail.com',NULL,3,'ACTIVE','2026-06-27 14:52:50'),(29,'demo','$2a$10$RM8nTVS63KeHOackwwLGyeLlDlwZPwZ1LtlukScXDJxyAoNwLjR3i','demo@example.com',NULL,3,'ACTIVE','2026-06-27 15:33:59');

/*!40000 ALTER TABLE `users` ENABLE KEYS */;

UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;

/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;

/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;

/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;

/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;



-- Dump completed on 2026-06-29 18:52:58

