const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const { authAdmin } = require('../middleware/auth');
const { success, fail, paginate } = require('../utils');
const { uploadSingle, uploadArray, toWebp } = require('../utils/upload');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');

// POST /admin-api/login
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

// === DASHBOARD ===
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

// === FILE UPLOAD ===
router.post('/upload', (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) return res.json(fail(err.message));
    if (!req.file) return res.json(fail('未选择文件'));
    const fileUrl = '/uploads/' + req.file.filename;
    // Try to convert to webp in background
    try { await toWebp(req.file.path); } catch(e) { /* ignore */ }
    res.json(success({ url: fileUrl, name: req.file.filename }));
  });
});

router.post('/upload/multi', (req, res) => {
  uploadArray(req, res, async (err) => {
    if (err) return res.json(fail(err.message));
    if (!req.files || !req.files.length) return res.json(fail('未选择文件'));
    const files = req.files.map(f => ({ url: '/uploads/' + f.filename, name: f.filename }));
    // Convert to webp
    for (const f of req.files) {
      try { await toWebp(f.path); } catch(e) { /* ignore */ }
    }
    res.json(success(files));
  });
});

// === PRODUCTS ===
router.get('/products', async (req, res) => {
  try {
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
  } catch (e) { res.json(fail(e.message)); }
});

router.get('/products/list/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title_zh, title_en, slug, thumbnail, main_image FROM products ORDER BY id DESC');
    res.json(success(rows));
  } catch (e) { res.json(fail(e.message)); }
});

router.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.json(fail('产品不存在'));
    const p = rows[0];
    // Parse JSON fields
    ['images','specs','highlights','blocks','faqs','recommends'].forEach(k => {
      if (p[k] && typeof p[k] === 'string') try { p[k] = JSON.parse(p[k]); } catch(e) { p[k] = []; }
    });
    if (p.tags && typeof p.tags === 'string') p.tags = p.tags.split(',').filter(Boolean);
    if (p.seo_keywords && typeof p.seo_keywords === 'string') p.seo_keywords = p.seo_keywords.split(',').filter(Boolean);
    res.json(success(p));
  } catch (e) { res.json(fail(e.message)); }
});

router.post('/products', async (req, res) => {
  try {
    const { title_zh, title_en, slug, category_id, content_zh, content_en, specs, moq,
      brand, short_name, summary, highlights, blocks, faqs, faq_show,
      seo_title, seo_desc, seo_keywords, canonical, seo_indexed, auto_alt, auto_structured,
      recommend_title, recommends, tags, main_image, thumbnail, images, status } = req.body;
    if (!title_zh || !title_en) return res.json(fail('标题必填'));
    await pool.query(
      `INSERT INTO products SET
       title_zh=?, title_en=?, slug=?, category_id=?, content_zh=?, content_en=?,
       specs=?, moq=?, brand=?, short_name=?, summary=?,
       highlights=?, blocks=?, faqs=?, faq_show=?,
       seo_title=?, seo_desc=?, seo_keywords=?, canonical=?,
       seo_indexed=?, auto_alt=?, auto_structured=?,
       recommend_title=?, recommends=?, tags=?, main_image=?, thumbnail=?, images=?, status=?`,
      [title_zh, title_en, slug || '', category_id || 0, content_zh || '', content_en || '',
       JSON.stringify(specs||{}), moq||'', brand||'FULIYA', short_name||'', summary||'',
       JSON.stringify(highlights||[]), JSON.stringify(blocks||[]), JSON.stringify(faqs||[]), faq_show??0,
       seo_title||'', seo_desc||'', seo_keywords||'', canonical||'', seo_indexed??1, auto_alt??1, auto_structured??1,
       recommend_title||'', JSON.stringify(recommends||[]), tags||'', main_image||'', thumbnail||'',
       JSON.stringify(images||[]), status??1]
    );
    res.json(success(null, '添加成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const body = req.body;
    const fields = [], values = [];
    if (body.title_zh !== undefined) { fields.push('title_zh=?'); values.push(body.title_zh); }
    if (body.title_en !== undefined) { fields.push('title_en=?'); values.push(body.title_en); }
    if (body.slug !== undefined) { fields.push('slug=?'); values.push(body.slug); }
    if (body.category_id !== undefined) { fields.push('category_id=?'); values.push(body.category_id); }
    if (body.content_zh !== undefined) { fields.push('content_zh=?'); values.push(body.content_zh); }
    if (body.content_en !== undefined) { fields.push('content_en=?'); values.push(body.content_en); }
    if (body.specs !== undefined) { fields.push('specs=?'); values.push(JSON.stringify(body.specs)); }
    if (body.moq !== undefined) { fields.push('moq=?'); values.push(body.moq); }
    if (body.brand !== undefined) { fields.push('brand=?'); values.push(body.brand); }
    if (body.short_name !== undefined) { fields.push('short_name=?'); values.push(body.short_name); }
    if (body.summary !== undefined) { fields.push('summary=?'); values.push(body.summary); }
    if (body.highlights !== undefined) { fields.push('highlights=?'); values.push(JSON.stringify(body.highlights)); }
    if (body.blocks !== undefined) { fields.push('blocks=?'); values.push(JSON.stringify(body.blocks)); }
    if (body.faqs !== undefined) { fields.push('faqs=?'); values.push(JSON.stringify(body.faqs)); }
    if (body.faq_show !== undefined) { fields.push('faq_show=?'); values.push(body.faq_show); }
    if (body.seo_title !== undefined) { fields.push('seo_title=?'); values.push(body.seo_title); }
    if (body.seo_desc !== undefined) { fields.push('seo_desc=?'); values.push(body.seo_desc); }
    if (body.seo_keywords !== undefined) { fields.push('seo_keywords=?'); values.push(body.seo_keywords); }
    if (body.canonical !== undefined) { fields.push('canonical=?'); values.push(body.canonical); }
    if (body.seo_indexed !== undefined) { fields.push('seo_indexed=?'); values.push(body.seo_indexed); }
    if (body.auto_alt !== undefined) { fields.push('auto_alt=?'); values.push(body.auto_alt); }
    if (body.auto_structured !== undefined) { fields.push('auto_structured=?'); values.push(body.auto_structured); }
    if (body.recommend_title !== undefined) { fields.push('recommend_title=?'); values.push(body.recommend_title); }
    if (body.recommends !== undefined) { fields.push('recommends=?'); values.push(JSON.stringify(body.recommends)); }
    if (body.tags !== undefined) { fields.push('tags=?'); values.push(body.tags); }
    if (body.main_image !== undefined) { fields.push('main_image=?'); values.push(body.main_image); }
    if (body.thumbnail !== undefined) { fields.push('thumbnail=?'); values.push(body.thumbnail); }
    if (body.images !== undefined) { fields.push('images=?'); values.push(JSON.stringify(body.images)); }
    if (body.status !== undefined) { fields.push('status=?'); values.push(body.status); }
    if (fields.length === 0) return res.json(fail('无变更'));
    values.push(req.params.id);
    await pool.query('UPDATE products SET ' + fields.join(',') + ' WHERE id=?', values);
    res.json(success(null, '更新成功'));
  } catch (e) { res.json(fail(e.message)); }
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

router.put('/categories/:id', async (req, res) => {
  const { name_zh, name_en, slug, parent_id, sort_order, status } = req.body;
  await pool.query(
    'UPDATE product_categories SET name_zh=?, name_en=?, slug=?, parent_id=?, sort_order=?, status=? WHERE id=?',
    [name_zh, name_en, slug, parent_id??0, sort_order??0, status??1, req.params.id]
  );
  res.json(success(null, '更新成功'));
});

router.delete('/categories/:id', async (req, res) => {
  await pool.query('UPDATE product_categories SET status=0 WHERE id=?', [req.params.id]);
  res.json(success(null, '已删除'));
});

// === NEWS ===
router.get('/news', async (req, res) => {
  try {
    const { page, pageSize, offset } = paginate(req.query.page, 20);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM news');
    const [rows] = await pool.query('SELECT id, title_zh, title_en, slug, thumbnail, tags, status, create_time FROM news ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, offset]);
    res.json(success({ list: rows, total, page, pageSize }));
  } catch (e) { res.json(fail(e.message)); }
});

router.get('/news/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM news WHERE id=?', [req.params.id]);
    if (!rows.length) return res.json(fail('新闻不存在'));
    res.json(success(rows[0]));
  } catch (e) { res.json(fail(e.message)); }
});

router.post('/news', async (req, res) => {
  try {
    const { title_zh, title_en, slug, content_zh, content_en, thumbnail, tags, status } = req.body;
    if (!title_zh) return res.json(fail('标题必填'));
    await pool.query('INSERT INTO news (title_zh,title_en,slug,content_zh,content_en,thumbnail,tags,status) VALUES (?,?,?,?,?,?,?,?)',
      [title_zh, title_en || '', slug||'', content_zh || '', content_en || '', thumbnail||'', tags||'', status??1]);
    res.json(success(null, '发布成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.put('/news/:id', async (req, res) => {
  try {
    const body = req.body;
    const fields = [], values = [];
    if (body.title_zh !== undefined) { fields.push('title_zh=?'); values.push(body.title_zh); }
    if (body.title_en !== undefined) { fields.push('title_en=?'); values.push(body.title_en); }
    if (body.slug !== undefined) { fields.push('slug=?'); values.push(body.slug); }
    if (body.content_zh !== undefined) { fields.push('content_zh=?'); values.push(body.content_zh); }
    if (body.content_en !== undefined) { fields.push('content_en=?'); values.push(body.content_en); }
    if (body.thumbnail !== undefined) { fields.push('thumbnail=?'); values.push(body.thumbnail); }
    if (body.tags !== undefined) { fields.push('tags=?'); values.push(body.tags); }
    if (body.status !== undefined) { fields.push('status=?'); values.push(body.status); }
    if (fields.length === 0) return res.json(fail('无变更'));
    values.push(req.params.id);
    await pool.query('UPDATE news SET ' + fields.join(',') + ' WHERE id=?', values);
    res.json(success(null, '更新成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.delete('/news/:id', async (req, res) => {
  await pool.query('UPDATE news SET status=0 WHERE id=?', [req.params.id]);
  res.json(success(null, '已下架'));
});

// === CASES ===
router.get('/cases', async (req, res) => {
  try {
    const { page, pageSize, offset } = paginate(req.query.page, 20);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM cases');
    const [rows] = await pool.query('SELECT id, title_zh, title_en, slug, client_name, thumbnail, status, create_time FROM cases ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, offset]);
    res.json(success({ list: rows, total, page, pageSize }));
  } catch (e) { res.json(fail(e.message)); }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cases WHERE id=?', [req.params.id]);
    if (!rows.length) return res.json(fail('案例不存在'));
    const c = rows[0];
    if (c.images && typeof c.images === 'string') try { c.images = JSON.parse(c.images); } catch(e) { c.images = []; }
    res.json(success(c));
  } catch (e) { res.json(fail(e.message)); }
});

router.post('/cases', async (req, res) => {
  try {
    const { title_zh, title_en, slug, client_name, content_zh, content_en, thumbnail, images, status } = req.body;
    if (!title_zh) return res.json(fail('标题必填'));
    await pool.query(
      'INSERT INTO cases (title_zh,title_en,slug,client_name,content_zh,content_en,thumbnail,images,status) VALUES (?,?,?,?,?,?,?,?,?)',
      [title_zh, title_en||'', slug||'', client_name||'', content_zh||'', content_en||'', thumbnail||'',
       JSON.stringify(images||[]), status??1]
    );
    res.json(success(null, '创建成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.put('/cases/:id', async (req, res) => {
  try {
    const body = req.body;
    const fields = [], values = [];
    if (body.title_zh !== undefined) { fields.push('title_zh=?'); values.push(body.title_zh); }
    if (body.title_en !== undefined) { fields.push('title_en=?'); values.push(body.title_en); }
    if (body.slug !== undefined) { fields.push('slug=?'); values.push(body.slug); }
    if (body.client_name !== undefined) { fields.push('client_name=?'); values.push(body.client_name); }
    if (body.content_zh !== undefined) { fields.push('content_zh=?'); values.push(body.content_zh); }
    if (body.content_en !== undefined) { fields.push('content_en=?'); values.push(body.content_en); }
    if (body.thumbnail !== undefined) { fields.push('thumbnail=?'); values.push(body.thumbnail); }
    if (body.images !== undefined) { fields.push('images=?'); values.push(JSON.stringify(body.images)); }
    if (body.status !== undefined) { fields.push('status=?'); values.push(body.status); }
    if (fields.length === 0) return res.json(fail('无变更'));
    values.push(req.params.id);
    await pool.query('UPDATE cases SET ' + fields.join(',') + ' WHERE id=?', values);
    res.json(success(null, '更新成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.delete('/cases/:id', async (req, res) => {
  await pool.query('UPDATE cases SET status=0 WHERE id=?', [req.params.id]);
  res.json(success(null, '已下架'));
});

// === MESSAGES ===
router.get('/messages', async (req, res) => {
  try {
    const { page, pageSize, offset } = paginate(req.query.page, 20);
    let where = 'WHERE 1=1';
    const params = [];
    const filter = req.query.filter;
    if (filter === 'unread') { where += ' AND status=0'; }
    else if (filter === 'read') { where += ' AND status=1'; }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM messages ${where}`, params);
    const [rows] = await pool.query(`SELECT * FROM messages ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    res.json(success({ list: rows, total, page, pageSize }));
  } catch (e) { res.json(fail(e.message)); }
});

router.put('/messages/:id', async (req, res) => {
  try {
    const { status, reply } = req.body;
    if (reply !== undefined) {
      await pool.query('UPDATE messages SET status=1, reply=? WHERE id=?', [reply, req.params.id]);
    } else {
      await pool.query('UPDATE messages SET status=? WHERE id=?', [status ?? 1, req.params.id]);
    }
    res.json(success(null, '更新成功'));
  } catch (e) { res.json(fail(e.message)); }
});

router.delete('/messages/:id', async (req, res) => {
  await pool.query('DELETE FROM messages WHERE id=?', [req.params.id]);
  res.json(success(null, '已删除'));
});

// === CONFIG ===
router.get('/config', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM website_config ORDER BY config_key');
  res.json(success(rows));
});

router.put('/config', async (req, res) => {
  try {
    const { configs } = req.body;
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
  } catch (e) { res.json(fail(e.message)); }
});

// === SECTIONS ===
router.get('/sections', async (req, res) => {
  try {
    const page = req.query.page || '';
    let where = 'WHERE 1=1';
    const params = [];
    if (page) { where += ' AND page_name=?'; params.push(page); }
    const [rows] = await pool.query(`SELECT * FROM page_sections ${where} ORDER BY page_name, sort`, params);
    res.json(success(rows));
  } catch (e) { res.json(fail(e.message)); }
});

router.put('/sections/:id', async (req, res) => {
  try {
    const { content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort, status } = req.body;
    await pool.query(
      'UPDATE page_sections SET content_zh=?,content_en=?,image_url=?,image_alt_zh=?,image_alt_en=?,sort=?,status=? WHERE id=?',
      [content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort??0, status ?? 1, req.params.id]
    );
    res.json(success(null, '保存成功'));
  } catch (e) { res.json(fail(e.message)); }
});

// === SYSTEM ===
router.get('/tools/stats', async (req, res) => {
  try {
    const [[{ products }]] = await pool.query('SELECT COUNT(*) as products FROM products');
    const [[{ news }]] = await pool.query('SELECT COUNT(*) as news FROM news');
    const [[{ cases }]] = await pool.query('SELECT COUNT(*) as cases FROM cases');
    const [[{ messages }]] = await pool.query('SELECT COUNT(*) as messages FROM messages');
    const [[{ admins }]] = await pool.query('SELECT COUNT(*) as admins FROM admins');
    res.json(success({ products, news, cases, messages, admins }));
  } catch (e) { res.json(fail(e.message)); }
});

router.post('/tools/clear-cache', async (req, res) => {
  res.json(success(null, '缓存已清除'));
});

module.exports = router;
