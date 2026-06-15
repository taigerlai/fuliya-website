-- ============================================================
-- 广州富丽雅实业有限公司 官网数据库
-- 模块一：建表 + 初始化数据
-- 兼容 MySQL 5.7+ / 8.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS `fuliya` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fuliya`;

-- -----------------------------------------------------------
-- 1. 全局配置表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `website_config`;
CREATE TABLE `website_config` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `config_key`  VARCHAR(64)     NOT NULL COMMENT '配置键',
  `config_value` TEXT           NOT NULL COMMENT '配置值',
  `lang`        ENUM('zh','en') NOT NULL DEFAULT 'zh' COMMENT '语言',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key_lang` (`config_key`, `lang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全站配置';

-- -----------------------------------------------------------
-- 2. 产品分类（支持父子分类）
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `product_categories`;
CREATE TABLE `product_categories` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `name_zh`     VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '分类名称-中文',
  `name_en`     VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '分类名称-英文',
  `slug`        VARCHAR(128)    NOT NULL DEFAULT '' COMMENT 'URL别名',
  `parent_id`   INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '父分类ID,0=顶级',
  `sort_order`  INT             NOT NULL DEFAULT 0 COMMENT '排序',
  `status`      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=显示 0=隐藏',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品分类';

-- -----------------------------------------------------------
-- 3. 产品表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `title_zh`    VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '产品标题-中文',
  `title_en`    VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '产品标题-英文',
  `slug`        VARCHAR(128)    NOT NULL DEFAULT '' COMMENT 'URL别名',
  `category_id` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '分类ID',
  `thumbnail`   VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '缩略图路径',
  `images`      TEXT            COMMENT '图集JSON',
  `content_zh`  LONGTEXT        COMMENT '产品描述-中文',
  `content_en`  LONGTEXT        COMMENT '产品描述-英文',
  `specs`       TEXT            COMMENT '参数JSON (Item/Material/Size/Color/MOQ等)',
  `tags`        VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '标签逗号分隔',
  `moq`         VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '起订量',
  `certificate` VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '认证信息',
  `status`      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=上架 0=下架',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品';

-- -----------------------------------------------------------
-- 4. 新闻表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `news`;
CREATE TABLE `news` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `title_zh`    VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '标题-中文',
  `title_en`    VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '标题-英文',
  `thumbnail`   VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '缩略图',
  `content_zh`  LONGTEXT        COMMENT '正文-中文',
  `content_en`  LONGTEXT        COMMENT '正文-英文',
  `tags`        VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '标签',
  `status`      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=已发布 0=草稿/下架',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新闻';

-- -----------------------------------------------------------
-- 5. 案例表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `cases`;
CREATE TABLE `cases` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `title_zh`    VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '案例标题-中文',
  `title_en`    VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '案例标题-英文',
  `client_name` VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '客户名称',
  `thumbnail`   VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '缩略图',
  `images`      TEXT            COMMENT '图集JSON',
  `content_zh`  LONGTEXT        COMMENT '案例详情-中文',
  `content_en`  LONGTEXT        COMMENT '案例详情-英文',
  `status`      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=展示中 0=已下架',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户案例';

-- -----------------------------------------------------------
-- 6. 页面区块表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `page_sections`;
CREATE TABLE `page_sections` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `page_name`     VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '页面标识 home/about/...',
  `section_key`   VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '区块标识 banner/advantages/...',
  `content_zh`    TEXT          COMMENT '区块内容-中文',
  `content_en`    TEXT          COMMENT '区块内容-英文',
  `image_url`     VARCHAR(512)  NOT NULL DEFAULT '' COMMENT '图片路径',
  `image_alt_zh`  VARCHAR(256)  NOT NULL DEFAULT '' COMMENT '图片Alt-中文',
  `image_alt_en`  VARCHAR(256)  NOT NULL DEFAULT '' COMMENT '图片Alt-英文',
  `sort`          INT           NOT NULL DEFAULT 0 COMMENT '排序',
  `status`        TINYINT       NOT NULL DEFAULT 1 COMMENT '1=显示 0=隐藏',
  PRIMARY KEY (`id`),
  KEY `idx_page` (`page_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面区块';

-- -----------------------------------------------------------
-- 7. 留言表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '姓名',
  `company`     VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '公司',
  `email`       VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '邮箱',
  `phone`       VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '手机号',
  `product_type` VARCHAR(128)   NOT NULL DEFAULT '' COMMENT '产品类型',
  `demand`      TEXT            COMMENT '需求描述',
  `status`      TINYINT         NOT NULL DEFAULT 0 COMMENT '0=未处理 1=已处理',
  `ip`          VARCHAR(45)     NOT NULL DEFAULT '' COMMENT '提交者IP',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='留言';

-- -----------------------------------------------------------
-- 8. 管理员表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '用户名',
  `password`    VARCHAR(256)    NOT NULL DEFAULT '' COMMENT '密码hash',
  `nickname`    VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '昵称',
  `status`      TINYINT         NOT NULL DEFAULT 1,
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员';

-- ============================================================
-- 初始化数据
-- ============================================================

-- 默认网站配置
INSERT INTO `website_config` (`config_key`, `config_value`, `lang`) VALUES
('site_title',       '广州富丽雅实业有限公司', 'zh'),
('site_title',       'Guangzhou Fuliya Industry Co., Ltd.', 'en'),
('seo_keywords',     '环保袋定制,包袋OEM,宠物包工厂,旅行包定制', 'zh'),
('seo_keywords',     'eco bag manufacturer,OEM bag factory,pet bag supplier', 'en'),
('seo_description',  '广州富丽雅实业有限公司-16年环保包袋OEM/ODM定制工厂', 'zh'),
('seo_description',  'Guangzhou Fuliya Industry - 16 years eco bag OEM/ODM manufacturer', 'en'),
('company_address',  '广州市白云区某某路88号', 'zh'),
('company_address',  'No.88 XX Road, Baiyun District, Guangzhou, China', 'en'),
('phone',            '+86-20-12345678', 'zh'),
('phone',            '+86-20-12345678', 'en'),
('email',            'info@fuliya.com', 'zh'),
('email',            'info@fuliya.com', 'en'),
('whatsapp',         '+86-138-0000-0000', 'zh'),
('whatsapp',         '+86-138-0000-0000', 'en'),
('linkedin',         'linkedin.com/company/fuliya', 'zh'),
('linkedin',         'linkedin.com/company/fuliya', 'en'),
('copyright',        '© 2026 广州富丽雅实业有限公司 All Rights Reserved', 'zh'),
('copyright',        '© 2026 Guangzhou Fuliya Industry Co., Ltd. All Rights Reserved', 'en'),
('icp',              '粤ICP备XXXXXXXX号', 'zh'),
('working_hours',    '周一至周五 9:00-18:00', 'zh'),
('working_hours',    'Mon-Fri 9:00-18:00', 'en'),
('default_lang',     'zh', 'zh'),
('site_status',      '1', 'zh');

-- 默认管理员密码: admin123 (后续改密)
INSERT INTO `admins` (`username`, `password`, `nickname`) VALUES
('admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGm5c5X5n5z5n5z5n5z5n', '管理员');

-- 产品父分类
INSERT INTO `product_categories` (`id`, `name_zh`, `name_en`, `slug`, `parent_id`, `sort_order`) VALUES
(1, '环保购物袋', 'Eco Shopping Bags', 'eco-shopping-bags', 0, 1),
(2, '棉布帆布袋', 'Cotton Canvas Bags', 'cotton-canvas-bags', 0, 2),
(3, '宠物包系列', 'Pet Bags', 'pet-bags', 0, 3),
(4, '旅行收纳系列', 'Travel Organizers', 'travel-organizers', 0, 4),
(5, '冷藏保温袋', 'Insulated Bags', 'insulated-bags', 0, 5);

-- 产品子分类
INSERT INTO `product_categories` (`id`, `name_zh`, `name_en`, `slug`, `parent_id`, `sort_order`) VALUES
(6, 'PP非织布', 'PP Non-woven', 'pp-nonwoven', 1, 1),
(7, '无纺布', 'Spunbond', 'spunbond', 1, 2),
(8, '纯棉帆布', 'Cotton Canvas', 'cotton-canvas', 2, 1),
(9, '麻棉混纺', 'Linen Cotton', 'linen-cotton', 2, 2),
(10, '航空包', 'Pet Carrier', 'pet-carrier', 3, 1),
(11, '出行手提包', 'Pet Tote', 'pet-tote', 3, 2),
(12, '收纳套装', 'Organizer Set', 'organizer-set', 4, 1),
(13, '洗漱包', 'Toiletry Bag', 'toiletry-bag', 4, 2);
