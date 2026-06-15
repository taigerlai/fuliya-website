const express = require('express');
const router = express.Router();
const pool = require('../models/db');

// Helper: get config by lang
async function getConfig(lang) {
  const [rows] = await pool.query('SELECT config_key, config_value FROM website_config WHERE lang=?', [lang]);
  const cfg = {};
  rows.forEach(r => { cfg[r.config_key] = r.config_value; });
  return cfg;
}

// Frontend page renderer
async function renderPage(req, res, page, data = {}) {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  res.render(`pages/${page}`, { ...data, config, lang, path: req.path });
}

// Home
router.get('/', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const [categories] = await pool.query('SELECT id, name_zh, name_en FROM product_categories WHERE parent_id=0 AND status=1 ORDER BY sort_order');
  const [products] = await pool.query('SELECT id, title_zh, title_en, slug, thumbnail, moq FROM products WHERE status=1 ORDER BY id DESC LIMIT 6');
  res.render('pages/home', { config, lang, categories, products });
});

// Products
router.get('/products', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const [categories] = await pool.query('SELECT * FROM product_categories WHERE status=1 ORDER BY sort_order');
  const catId = parseInt(req.query.category_id) || 0;
  let where = 'WHERE p.status=1';
  const params = [];
  if (catId > 0) { where += ' AND (p.category_id=? OR p.category_id IN (SELECT id FROM product_categories WHERE parent_id=?))'; params.push(catId, catId); }
  const [products] = await pool.query(
    `SELECT p.id, p.title_zh, p.title_en, p.slug, p.thumbnail, p.moq FROM products p ${where} ORDER BY p.id DESC LIMIT 16`,
    params
  );
  res.render('pages/products', { config, lang, categories, products, catId });
});

// Product detail
router.get('/products/:slug', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const [rows] = await pool.query('SELECT * FROM products WHERE slug=? AND status=1', [req.params.slug]);
  if (!rows.length) return res.redirect('/products');
  const product = rows[0];
  if (product.images) product.images = JSON.parse(product.images);
  if (product.specs) product.specs = JSON.parse(product.specs);
  res.render('pages/product-detail', { config, lang, product });
});

// About
router.get('/about', async (req, res) => renderPage(req, res, 'about'));

// Strength
router.get('/strength', async (req, res) => renderPage(req, res, 'strength'));

// Cases
router.get('/cases', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const [cases] = await pool.query('SELECT id, title_zh, title_en, client_name, thumbnail FROM cases WHERE status=1 ORDER BY id DESC');
  res.render('pages/cases', { config, lang, cases });
});

// News
router.get('/news', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const [news] = await pool.query('SELECT id, title_zh, title_en, thumbnail, tags, create_time FROM news WHERE status=1 ORDER BY create_time DESC');
  res.render('pages/news', { config, lang, news });
});

// Contact
router.get('/contact', async (req, res) => renderPage(req, res, 'contact'));

// Admin pages (SPA, all routes serve dashboard.ejs)
router.get('/admin', (req, res) => {
  res.render('admin/login');
});

router.get('/admin/dashboard', (req, res) => res.render('admin/dashboard'));
router.get('/admin/products', (req, res) => res.render('admin/dashboard'));
router.get('/admin/news', (req, res) => res.render('admin/dashboard'));
router.get('/admin/cases', (req, res) => res.render('admin/dashboard'));
router.get('/admin/pages', (req, res) => res.render('admin/dashboard'));
router.get('/admin/settings', (req, res) => res.render('admin/dashboard'));
router.get('/admin/messages', (req, res) => res.render('admin/dashboard'));
router.get('/admin/tools', (req, res) => res.render('admin/dashboard'));

module.exports = router;
