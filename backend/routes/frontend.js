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

// Helper: get page sections from DB
async function getSections(pageName, lang) {
  const [rows] = await pool.query(
    'SELECT section_key, content_zh, content_en, image_url, image_alt_zh, image_alt_en, sort FROM page_sections WHERE page_name=? AND status=1 ORDER BY sort',
    [pageName]
  );
  return rows.map(r => ({
    key: r.section_key,
    content: lang === 'zh' ? r.content_zh : r.content_en,
    image: r.image_url,
    alt: lang === 'zh' ? r.image_alt_zh : r.image_alt_en
  }));
}

// Frontend page renderer (with sections support)
async function renderPage(req, res, page, data = {}) {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections(page, lang);
  res.render(`pages/${page}`, { ...data, config, lang, sections, path: req.path });
}

// Admin product edit page (standalone, outside SPA)
router.get('/admin/products/new', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const [categories] = await pool.query('SELECT id, name_zh, name_en FROM product_categories ORDER BY sort_order');
  const [allProducts] = await pool.query('SELECT id, title_zh, title_en FROM products ORDER BY id DESC');
  res.render('admin/product-edit', {
    product: null,
    categories,
    allProducts,
    lang
  });
});

router.get('/admin/products/edit/:id', async (req, res) => {
  const lang = req.query.lang || 'zh';
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.redirect('/admin/products');
    const p = rows[0];
    // Parse JSON fields
    if (p.images && typeof p.images === 'string') try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; }
    if (p.specs && typeof p.specs === 'string') try { p.specs = JSON.parse(p.specs); } catch(e) { p.specs = []; }
    if (p.highlights && typeof p.highlights === 'string') try { p.highlights = JSON.parse(p.highlights); } catch(e) { p.highlights = []; }
    if (p.blocks && typeof p.blocks === 'string') try { p.blocks = JSON.parse(p.blocks); } catch(e) { p.blocks = []; }
    if (p.faqs && typeof p.faqs === 'string') try { p.faqs = JSON.parse(p.faqs); } catch(e) { p.faqs = []; }
    if (p.recommends && typeof p.recommends === 'string') try { p.recommends = JSON.parse(p.recommends); } catch(e) { p.recommends = []; }
    if (p.tags && typeof p.tags === 'string') p.tags = p.tags.split(',').filter(Boolean);
    if (p.seo_keywords && typeof p.seo_keywords === 'string') p.seo_keywords = p.seo_keywords.split(',').filter(Boolean);

    const [categories] = await pool.query('SELECT id, name_zh, name_en FROM product_categories ORDER BY sort_order');
    const [allProducts] = await pool.query('SELECT id, title_zh, title_en FROM products ORDER BY id DESC');

    res.render('admin/product-edit', {
      product: p,
      categories,
      allProducts,
      lang
    });
  } catch (e) {
    console.error('Product edit error:', e.message);
    res.redirect('/admin/products');
  }
});

// Home
router.get('/', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections('home', lang);
  const [categories] = await pool.query('SELECT id, name_zh, name_en FROM product_categories WHERE parent_id=0 AND status=1 ORDER BY sort_order');
  const [products] = await pool.query('SELECT id, title_zh, title_en, slug, thumbnail, moq FROM products WHERE status=1 ORDER BY id DESC LIMIT 6');
  res.render('pages/home', { config, lang, sections, categories, products });
});

// Products
router.get('/products', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections('products', lang);
  const [categories] = await pool.query('SELECT * FROM product_categories WHERE status=1 ORDER BY sort_order');
  const catId = parseInt(req.query.category_id) || 0;
  let where = 'WHERE p.status=1';
  const params = [];
  if (catId > 0) { where += ' AND (p.category_id=? OR p.category_id IN (SELECT id FROM product_categories WHERE parent_id=?))'; params.push(catId, catId); }
  const [products] = await pool.query(
    `SELECT p.id, p.title_zh, p.title_en, p.slug, p.thumbnail, p.moq FROM products p ${where} ORDER BY p.id DESC LIMIT 16`,
    params
  );
  res.render('pages/products', { config, lang, sections, categories, products, catId });
});

// Product detail
router.get('/products/:slug', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE slug=? AND status=1', [req.params.slug]);
    if (!rows.length) return res.redirect('/products');
    const p = rows[0];

    // Parse JSON fields
    const images = (p.images && typeof p.images === 'string')
      ? (() => { try { return JSON.parse(p.images); } catch(e) { return []; } })()
      : (p.images || []);
    const specs = (p.specs && typeof p.specs === 'string')
      ? (() => { try { return JSON.parse(p.specs); } catch(e) { return []; } })()
      : (p.specs || []);
    const highlights = (p.highlights && typeof p.highlights === 'string')
      ? (() => { try { return JSON.parse(p.highlights); } catch(e) { return []; } })()
      : (p.highlights || []);
    const blocks = (p.blocks && typeof p.blocks === 'string')
      ? (() => { try { return JSON.parse(p.blocks); } catch(e) { return []; } })()
      : (p.blocks || []);
    const faqs = (p.faqs && typeof p.faqs === 'string')
      ? (() => { try { return JSON.parse(p.faqs); } catch(e) { return []; } })()
      : (p.faqs || []);
    const recommends = (p.recommends && typeof p.recommends === 'string')
      ? (() => { try { return JSON.parse(p.recommends); } catch(e) { return []; } })()
      : (p.recommends || []);

    // Tags: comma-separated string → array
    const tags = p.tags ? p.tags.split(',').filter(Boolean) : [];

    // Fetch category
    let category = null;
    if (p.category_id) {
      const [catRows] = await pool.query('SELECT id, name_zh, name_en, slug FROM product_categories WHERE id=?', [p.category_id]);
      if (catRows.length) category = catRows[0];
    }

    // Build product object matching template expectations
    const product = {
      id: p.id,
      title_zh: p.title_zh,
      title_en: p.title_en,
      slug: p.slug,
      main_image: p.main_image || p.thumbnail,
      images: images.map((img, i) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        alt: img.alt || (p.brand + ' ' + (lang === 'zh' ? p.title_zh : p.title_en) + ' ' + (i + 1))
      })),
      brand: p.brand || 'FULIYA',
      short_name: p.short_name || '',
      summary: p.summary || '',
      category: category || null,
      specs: Array.isArray(specs) ? specs.map(s => ({
        name: s.name || s.Item || '',
        value: s.value || s.Size || ''
      })) : [],
      params: Array.isArray(specs) ? specs.slice(0, 6).map(s => ({
        name: s.name || '',
        value: s.value || ''
      })) : [],
      highlights: Array.isArray(highlights) ? highlights : [],
      blocks: Array.isArray(blocks) ? blocks : [],
      faqs: Array.isArray(faqs) ? faqs.map(f => ({ q: f.q || f.question || '', a: f.a || f.answer || '' })) : [],
      tags,
      moq: p.moq || '',
      certificate: p.certificate || '',
      seo_title: p.seo_title || '',
      seo_desc: p.seo_desc || '',
      seo_keywords: p.seo_keywords || [],
      canonical: p.canonical || '',
      seo_indexed: p.seo_indexed !== 0,
      auto_alt: p.auto_alt !== 0,
      auto_structured: p.auto_structured !== 0,
      recommend_title: p.recommend_title || 'Product recommendation',
      recommends: Array.isArray(recommends) ? recommends.map(id => ({ id })) : [],
      recommend_slugs: Array.isArray(recommends) ? recommends : [],
      faq_show: p.faq_show === 1,
      status: p.status
    };

    res.render('pages/product-detail', { config, lang, product });
  } catch (e) {
    console.error('Product detail error:', e.message);
    res.redirect('/products');
  }
});

// About
router.get('/about', async (req, res) => renderPage(req, res, 'about'));

// Strength
router.get('/strength', async (req, res) => renderPage(req, res, 'strength'));

// Cases
router.get('/cases', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections('cases', lang);
  const [cases] = await pool.query('SELECT id, title_zh, title_en, client_name, thumbnail FROM cases WHERE status=1 ORDER BY id DESC');
  res.render('pages/cases', { config, lang, sections, cases });
});

// News
router.get('/news', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections('news', lang);
  const [news] = await pool.query('SELECT id, title_zh, title_en, thumbnail, tags, create_time FROM news WHERE status=1 ORDER BY create_time DESC');
  res.render('pages/news', { config, lang, sections, news });
});

// Contact
router.get('/contact', async (req, res) => {
  const lang = req.query.lang || 'zh';
  const config = await getConfig(lang);
  const sections = await getSections('contact', lang);
  res.render('pages/contact', { config, lang, sections });
});

// Admin pages (SPA)
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
