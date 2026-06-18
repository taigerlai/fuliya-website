const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const { authAdmin } = require('../middleware/auth');
const { success, fail, paginate } = require('../utils');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');

// POST /admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json(fail('请输入用户名和密码'));
    const [rows] = await pool.query('SELECT * FROM admins WHERE username=? AND status=1', [username]);
    if (!rows.length) return res.json(fail('用户名或密码错误'));
    const admin = rows[0];
    if (!bcrypt.compareSync(password, admin.password)) return res.json(fail('用户名或密码错误'));
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json(success({ token, nickname: admin.nickname }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// All routes below require auth
router.use(authAdmin);

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ products }]] = await pool.query('SELECT COUNT(*) as products FROM products');
    const [[{ productOn }]] = await pool.query('SELECT COUNT(*) as productOn FROM products WHERE status=1');
    const [[{ news }]] = await pool.query('SELECT COUNT(*) as news FROM news');
    const [[{ cases }]] = await pool.query('SELECT COUNT(*) as cases FROM cases');
    const [[{ messages }]] = await pool.query('SELECT COUNT(*) as messages FROM messages');
    const [[{ unread }]] = await pool.query('SELECT COUNT(*) as unread FROM messages WHERE status=0');
    res.json(success({ products, productOn, productOff: products - productOn, news, cases, messages, unread }));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// === PRODUCTS ===
router.get('/products', async (req, res) => {
  const { page, pageSize, offset } = paginate(req.query.page, 20);
  const catId = parseInt(req.query.category_id) || 0;
  let where = 'WHERE 1=1';
  const params = [];
  if (catId > 0) { where += ' AND category_id=?'; params.push(catId); }
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM products ${where}`, params);
  const [rows] = await pool.query(
    `SELECT p.id, p.title_zh, p.title_en, p.slug, p.thumbnail, p.moq, p.status, p.create_time, c.name_zh as cat
     FROM products p LEFT JOIN product_categories c ON p.category_id=c.id ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json(success({ list: rows, total, page, pageSize }));
});

router.post('/products', async (req, res) => {
  const { title_zh, title_en, slug, category_id, content_zh, content_en, specs, moq,
    brand, short_name, summary, highlights, blocks, faqs, faq_show,
    seo_title, seo_desc, seo_keywords, canonical, seo_indexed, auto_alt, auto_structured,
    recommend_title, recommends, tags, main_image, thumbnail, images, status } = req.body;
  if (!title_zh || !title_en) return res.json(fail('标题必填'));
  await pool.query(
    `INSERT INTO products 
     (title_zh,title_en,slug,category_id,content_zh,content_en,specs,moq,
      brand,short_name,summary,highlights,blocks,faqs,faq_show,
      seo_title,seo_desc,seo_keywords,canonical,seo_indexed,auto_alt,auto_structured,
      recommend_title,recommends,tags,main_image,thumbnail,images,status)
     VALUES (?,?,?,?,?,?,?,?,
             ?,?,?,?,?,?,?,
             ?,?,?,?,?,?,?,
             ?,?,?,?,?,?,?,?)`,
    [title_zh, title_en, slug || '', category_id || 0, content_zh || '', content_en || '',
     typeof specs==='string'?specs:JSON.stringify(specs||{}), moq || '',
     brand||'FULIYA', short_name||'', summary||'',
     typeof highlights==='string'?highlights:JSON.stringify(highlights||[]),
     typeof blocks==='string'?blocks:JSON.stringify(blocks||[]),
     typeof faqs==='string'?faqs:JSON.stringify(faqs||[]),
     faq_show??0,
     seo_title||'', seo_desc||'', seo_keywords||'', canonical||'',
     seo_indexed??1, auto_alt??1, auto_structured??1,
     recommend_title||'', typeof recommends==='string'?recommends:JSON.stringify(recommends||[]),
     tags||'', main_image||'', thumbnail||'',
     typeof images==='string'?images:JSON.stringify(images||[]),
     status??1]
  );
  res.json(success(null, '添加成功'));
});

router.put('/products/:id', async (req, res) => {
  const { title_zh, title_en, slug, category_id, content_zh, content_en, specs, moq,
    brand, short_name, summary, highlights, blocks, faqs, faq_show,
    seo_title, seo_desc, seo_keywords, canonical, seo_indexed, auto_alt, auto_structured,
    recommend_title, recommends, tags, main_image, thumbnail, images, status } = req.body;
  await pool.query(
    `UPDATE products SET
     title_zh=?, title_en=?, slug=?, category_id=?, content_zh=?, content_en=?,
     specs=?, moq=?, brand=?, short_name=?, summary=?,
     highlights=?, blocks=?, faqs=?, faq_show=?,
     seo_title=?, seo_desc=?, seo_keywords=?, canonical=?,
     seo_indexed=?, auto_alt=?, auto_structured=?,
     recommend_title=?, recommends=?, tags=?, main_image=?, thumbnail=?, images=?,
     status=?
     WHERE id=?`,
    [title_zh, title_en, slug, category_id, content_zh, content_en,
     typeof specs==='string'?specs:JSON.stringify(specs||{}), moq,
     brand, short_name, summary,
     typeof highlights==='string'?highlights:JSON.stringify(highlights||[]),
     typeof blocks==='string'?blocks:JSON.stringify(blocks||[]),
     typeof faqs==='string'?faqs:JSON.stringify(faqs||[]),
     faq_show,
     seo_title, seo_desc, seo_keywords, canonical,
     seo_indexed, auto_alt, auto_structured,
     recommend_title,
     typeof recommends==='string'?recommends:JSON.stringify(recommends||[]),
     tags, main_image, thumbnail,
     typeof images==='string'?images:JSON.stringify(images||[]),
     status ?? 1, req.params.id]
  );
  res.json(success(null, '更新成功'));
});

// GET /admin/products/:id - Get single product for edit
router.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.json(fail('产品不存在'));
    const p = rows[0];
    // Parse JSON fields
    if (p.images && typeof p.images === 'string') p.images = JSON.parse(p.images);
    if (p.specs && typeof p.specs === 'string') p.specs = JSON.parse(p.specs);
    if (p.highlights && typeof p.highlights === 'string') p.highlights = JSON.parse(p.highlights);
    if (p.blocks && typeof p.blocks === 'string') p.blocks = JSON.parse(p.blocks);
    if (p.faqs && typeof p.faqs === 'string') p.faqs = JSON.parse(p.faqs);
    if (p.recommends && typeof p.recommends === 'string') p.recommends = JSON.parse(p.recommends);
    if (p.tags && typeof p.tags === 'string') p.tags = p.tags.split(',').filter(Boolean);
    if (p.seo_keywords && typeof p.seo_keywords === 'string') p.seo_keywords = p.seo_keywords.split(',').filter(Boolean);
    res.json(success(p));
  } catch (e) {
    res.json(fail(e.message));
  }
});

// GET /admin/products/list - Get all products for selector
router.get('/products/list/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title_zh, title_en, slug, thumbnail FROM products ORDER BY id DESC');
    res.json(success(rows));
  } catch (e) {
    res.json(fail(e.message));
  }
});

router.delete('/products/:id', async (req, res) => {
  await pool.query('UPDATE products SET status=0 WHERE id=?', [req.params.id]);
  res.json(success(null, '已下架'));
});

// === CATEGORIES ===
router.get('/categories', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY sort_order');
  res.json(success(rows));
});

router.post('/categories', async (req, res) => {
  const { name_zh, name_en, slug, parent_id, sort_order } = req.body;
  if (!name_zh) return res.json(fail('分类名必填'));
  await pool.query(
    'INSERT INTO product_categories (name_zh,name_en,slug,parent_id,sort_order) VALUES (?,?,?,?,?)',
    [name_zh, name_en || '', slug || '', parent_id || 0, sort_order || 0]
  );
  res.json(success(null, '添加成功'));
});

// === NEWS ===
router.get('/news', async (req, res) => {
  const { page, pageSize, offset } = paginate(req.query.page, 20);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM news');
  const [rows] = await pool.query('SELECT id,title_zh,title_en,thumbnail,tags,status,create_time FROM news ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  res.json(success({ list: rows, total, page, pageSize }));
});

router.post('/news', async (req, res) => {
  const { title_zh, title_en, content_zh, content_en, tags } = req.body;
  if (!title_zh) return res.json(fail('标题必填'));
  await pool.query('INSERT INTO news (title_zh,title_en,content_zh,content_en,tags) VALUES (?,?,?,?,?)',
    [title_zh, title_en || '', content_zh || '', content_en || '', tags || '']);
  res.json(success(null, '发布成功'));
});

router.put('/news/:id', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE news SET status=? WHERE id=?', [status ?? 1, req.params.id]);
  res.json(success(null, '更新成功'));
});

// === CASES ===
router.get('/cases', async (req, res) => {
  const { page, pageSize, offset } = paginate(req.query.page, 20);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM cases');
  const [rows] = await pool.query('SELECT id,title_zh,title_en,client_name,thumbnail,status,create_time FROM cases ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  res.json(success({ list: rows, total, page, pageSize }));
});

router.put('/cases/:id', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE cases SET status=? WHERE id=?', [status ?? 1, req.params.id]);
  res.json(success(null, '更新成功'));
});

// === MESSAGES ===
router.get('/messages', async (req, res) => {
  const { page, pageSize, offset } = paginate(req.query.page, 20);
  const filter = req.query.filter;
  let where = 'WHERE 1=1';
  const params = [];
  if (filter === 'unread') { where += ' AND status=0'; }
  else if (filter === 'read') { where += ' AND status=1'; }
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM messages ${where}`, params);
  const [rows] = await pool.query(`SELECT * FROM messages ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
  res.json(success({ list: rows, total, page, pageSize }));
});

router.put('/messages/:id', async (req, res) => {
  await pool.query('UPDATE messages SET status=1 WHERE id=?', [req.params.id]);
  res.json(success(null, '标记已处理'));
});

// === CONFIG ===
router.get('/config', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM website_config ORDER BY config_key');
  res.json(success(rows));
});

router.put('/config', async (req, res) => {
  const { configs } = req.body; // [{key, value, lang}]
  if (!Array.isArray(configs)) return res.json(fail('参数错误'));
  for (const c of configs) {
    if (c.key && c.value !== undefined) {
      await pool.query(
        'INSERT INTO website_config (config_key, config_value, lang) VALUES (?,?,?) ON DUPLICATE KEY UPDATE config_value=?',
        [c.key, c.value, c.lang || 'zh', c.value]
      );
    }
  }
  res.json(success(null, '保存成功'));
});

// === SECTIONS ===
router.get('/sections', async (req, res) => {
  const page = req.query.page || '';
  let where = 'WHERE 1=1';
  const params = [];
  if (page) { where += ' AND page_name=?'; params.push(page); }
  const [rows] = await pool.query(`SELECT * FROM page_sections ${where} ORDER BY page_name, sort`, params);
  res.json(success(rows));
});

router.put('/sections/:id', async (req, res) => {
  const { content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort, status } = req.body;
  await pool.query(
    'UPDATE page_sections SET content_zh=?,content_en=?,image_url=?,image_alt_zh=?,image_alt_en=?,sort=?,status=? WHERE id=?',
    [content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort??0, status ?? 1, req.params.id]
  );
  res.json(success(null, '保存成功'));
});

module.exports = router;
