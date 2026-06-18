-- ============================================================
-- 富丽雅官网 数据库迁移 2026-06-17
-- 新增产品表扩展字段，支持完整7Tab产品编辑功能
-- ============================================================

USE `fuliya`;

-- products 表新增字段
ALTER TABLE `products`
  ADD COLUMN `brand`          VARCHAR(128) NOT NULL DEFAULT 'FULIYA' COMMENT '品牌名称' AFTER `slug`,
  ADD COLUMN `short_name`     VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '产品简称(推荐位用)' AFTER `brand`,
  ADD COLUMN `summary`        TEXT         COMMENT '基础简介(首屏描述)' AFTER `short_name`,
  ADD COLUMN `highlights`     TEXT         COMMENT '核心卖点JSON [{title,text}]' AFTER `specs`,
  ADD COLUMN `blocks`         LONGTEXT     COMMENT '详情区块JSON [{type,url,text,...}]' AFTER `highlights`,
  ADD COLUMN `faqs`           TEXT         COMMENT 'FAQ JSON [{q,a}]' AFTER `blocks`,
  ADD COLUMN `faq_show`       TINYINT      NOT NULL DEFAULT 0 COMMENT '0=结构化数据不展示 1=页面展示' AFTER `faqs`,
  ADD COLUMN `seo_title`      VARCHAR(256) NOT NULL DEFAULT '' COMMENT 'SEO标题' AFTER `faq_show`,
  ADD COLUMN `seo_desc`       TEXT         COMMENT 'Meta描述' AFTER `seo_title`,
  ADD COLUMN `seo_keywords`   VARCHAR(512) NOT NULL DEFAULT '' COMMENT 'Meta关键词' AFTER `seo_desc`,
  ADD COLUMN `canonical`      VARCHAR(512) NOT NULL DEFAULT '' COMMENT '标准链接' AFTER `seo_keywords`,
  ADD COLUMN `seo_indexed`    TINYINT      NOT NULL DEFAULT 1 COMMENT '允许收录' AFTER `canonical`,
  ADD COLUMN `auto_alt`       TINYINT      NOT NULL DEFAULT 1 COMMENT '自动ALT' AFTER `seo_indexed`,
  ADD COLUMN `auto_structured` TINYINT     NOT NULL DEFAULT 1 COMMENT '自动结构化数据' AFTER `auto_alt`,
  ADD COLUMN `recommend_title` VARCHAR(128) NOT NULL DEFAULT 'Product recommendation' COMMENT '推荐栏标题' AFTER `auto_structured`,
  ADD COLUMN `recommends`     TEXT         COMMENT '关联产品ID JSON [1,2,3]' AFTER `recommend_title`,
  ADD COLUMN `main_image`     VARCHAR(512) NOT NULL DEFAULT '' COMMENT '首屏主图URL' AFTER `thumbnail`;
