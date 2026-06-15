const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { success, fail, paginate } = require('../utils');

// GET /api/config/:key - Get site config
router.get('/config/:key', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query(
      'SELECT config_value FROM website_config WHERE config_key = ? AND lang = ? LIMIT 1',
      [req.params.key, lang]
    );
    res.json(success(rows[0]?.config_value || ''));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/config - Get all site config
router.get('/config', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query(
      'SELECT config_key, config_value FROM website_config WHERE lang = ?', [lang]
    );
    const config = {};
    rows.forEach(r => { config[r.config_key] = r.config_value; });
    res.json(success(config));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/categories - Get product categories (with children)
router.get('/categories', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query(
      'SELECT id, name_zh, name_en, slug, parent_id, sort_order FROM product_categories WHERE status=1 ORDER BY sort_order'
    );
    const parents = rows.filter(r => r.parent_id === 0);
    const children = rows.filter(r => r.parent_id > 0);
    const result = parents.map(p => ({
      id: p.id, name: lang === 'zh' ? p.name_zh : p.name_en,
      slug: p.slug, children: children.filter(c => c.parent_id === p.id).map(c => ({
        id: c.id, name: lang === 'zh' ? c.name_zh : c.name_en, slug: c.slug
      }))
    }));
    res.json(success(result));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/products - Get product list
router.get('/products', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const catId = parseInt(req.query.category_id) || 0;
    const search = req.query.search || '';

    let where = 'WHERE p.status=1';
    const params = [];
    if (catId > 0) {
      where += ' AND (p.category_id = ? OR p.category_id IN (SELECT id FROM product_categories WHERE parent_id = ?))';
      params.push(catId, catId);
    }
    if (search) {
      where += ' AND (p.title_zh LIKE ? OR p.title_en LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM products p ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT p.id, p.title_zh, p.title_en, p.slug, p.thumbnail, p.moq, p.status,
              p.tags, c.name_zh as cat_zh, c.name_en as cat_en
       FROM products p LEFT JOIN product_categories c ON p.category_id = c.id
       ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = rows.map(r => ({
      id: r.id, title: lang === 'zh' ? r.title_zh : r.title_en,
      slug: r.slug, thumbnail: r.thumbnail, moq: r.moq,
      category: lang === 'zh' ? r.cat_zh : r.cat_en, tags: r.tags
    }));
    res.json(success({ list, total, page, pageSize }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/products/:slug - Get product detail
router.get('/products/:slug', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE slug = ? AND status = 1 LIMIT 1', [req.params.slug]
    );
    if (!rows.length) return res.json(fail('产品不存在'));
    const p = rows[0];
    const product = {
      id: p.id, title: lang === 'zh' ? p.title_zh : p.title_en,
      slug: p.slug, thumbnail: p.thumbnail,
      images: p.images ? JSON.parse(p.images) : [],
      content: lang === 'zh' ? p.content_zh : p.content_en,
      specs: p.specs ? JSON.parse(p.specs) : {},
      moq: p.moq, certificate: p.certificate, tags: p.tags
    };
    res.json(success(product));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/news - Get news list
router.get('/news', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM news WHERE status=1');
    const [rows] = await pool.query(
      'SELECT id, title_zh, title_en, thumbnail, tags, create_time FROM news WHERE status=1 ORDER BY create_time DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    const list = rows.map(r => ({
      id: r.id, title: lang === 'zh' ? r.title_zh : r.title_en,
      thumbnail: r.thumbnail, tags: r.tags, date: r.create_time
    }));
    res.json(success({ list, total, page, pageSize }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/news/:id
router.get('/news/:id', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query('SELECT * FROM news WHERE id=? AND status=1', [req.params.id]);
    if (!rows.length) return res.json(fail('新闻不存在'));
    const n = rows[0];
    res.json(success({
      id: n.id, title: lang === 'zh' ? n.title_zh : n.title_en,
      content: lang === 'zh' ? n.content_zh : n.content_en,
      thumbnail: n.thumbnail, tags: n.tags, date: n.create_time
    }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/cases - Get cases list
router.get('/cases', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM cases WHERE status=1');
    const [rows] = await pool.query(
      'SELECT id, title_zh, title_en, client_name, thumbnail, create_time FROM cases WHERE status=1 ORDER BY id DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    const list = rows.map(r => ({
      id: r.id, title: lang === 'zh' ? r.title_zh : r.title_en,
      client: r.client_name, thumbnail: r.thumbnail, date: r.create_time
    }));
    res.json(success({ list, total, page, pageSize }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// POST /api/messages - Submit contact message
router.post('/messages', async (req, res) => {
  try {
    const { name, company, email, phone, product_type, demand } = req.body;
    if (!name || !email || !demand) return res.json(fail('姓名、邮箱、需求为必填'));
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await pool.query(
      'INSERT INTO messages (name, company, email, phone, product_type, demand, ip) VALUES (?,?,?,?,?,?,?)',
      [name, company || '', email, phone || '', product_type || '', demand, ip]
    );
    res.json(success(null, '提交成功'));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /api/sections/:page - Get page sections
router.get('/sections/:page', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const [rows] = await pool.query(
      'SELECT section_key, content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort FROM page_sections WHERE page_name=? AND status=1 ORDER BY sort',
      [req.params.page]
    );
    const list = rows.map(r => ({
      key: r.section_key,
      content: lang === 'zh' ? r.content_zh : r.content_en,
      image: r.image_url,
      alt: lang === 'zh' ? r.image_alt_zh : r.image_alt_en
    }));
    res.json(success(list));
  } catch (e) {
    res.json(fail(e.message));
  }
});

module.exports = router;
