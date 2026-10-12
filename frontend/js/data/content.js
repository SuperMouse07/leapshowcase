/**
 * data/content.js · 前台编辑性常量（分类元数据与品牌故事文案）
 * ------------------------------------------------------------
 * 商品 / 轮播 / 设置为服务器数据（见 api 层）；此处仅存结构性与编辑性内容，
 * 不属于后台管理范围。分类沿用 LeapShop 标准产品目录（ADR-0004：不整体替换分类）。
 */

export const BRAND = {
  name: 'LEAP',
  logo: 'assets/logo.svg',
  microTop: 'One-stop comprehensive service provider for global sports clubs',
};

/** 标准产品系列（分类）；id 与后端 products.category 对应 */
export const CATS = [
  { id: 'chess-clock', label: 'Chess Clock' },
  { id: 'chess-board', label: 'Chess Board' },
  { id: 'stopwatch', label: 'Stopwatch' },
  { id: 'lifestyle', label: 'Chess Lifestyle' },
];

/** 系列页元数据（统一由 series.html?cat=<id> 驱动） */
export const CAT_META = {
  'chess-clock': {
    title: 'Chess Clock',
    kicker: 'Precision Timing',
    tagline: 'Tournament-grade time control, precise to the very last second — from league clocks to classroom starters.',
  },
  'chess-board': {
    title: 'Chess Board',
    kicker: 'The 64 Squares',
    tagline: 'From walnut inlay to magnetic travel sets — the perfect 64 squares for every playing scene.',
  },
  stopwatch: {
    title: 'Stopwatch',
    kicker: 'Every Second Counts',
    tagline: 'The 3D-printed portable series and referee-grade dual channels — countdowns at a glance.',
  },
  lifestyle: {
    title: 'Chess Lifestyle',
    kicker: 'Sip. Think. Win.',
    tagline: 'Bring the 64 squares into everyday life: objects, textiles and collector-grade pieces.',
  },
};

/** 系列页链接（统一参数化路由） */
export const seriesHref = (catId) => `series.html?cat=${encodeURIComponent(catId)}`;

/** 取系列元数据（未知分类回退） */
export function catMeta(catId) {
  return CAT_META[catId] || { title: catId || 'Collection', kicker: 'Collection', tagline: '' };
}

/** Why Choose Leap —— 三条价值主张 */
export const WHY = [
  {
    n: '01',
    t: 'Deep R&D Foundation',
    d: 'Backed by our parent company’s R&D center and numerous timing-technology patents, every clock and board passes rigorous stress testing.',
  },
  {
    n: '02',
    t: 'Professional Excellence',
    d: 'Built to the exacting standards of the professional community — widely used in clubs and sanctioned tournaments worldwide.',
  },
  {
    n: '03',
    t: 'Factory-Direct Assurance',
    d: 'Our own factory controls quality from raw material to packaging, delivering professional-grade gear at a value intermediaries cannot match.',
  },
];

/** 品牌历程数字（CSS @property 计数动画，--to 为目标值） */
export const STATS = [
  { to: 32, suffix: '', label: 'Years of Craft' },
  { to: 46, suffix: '', label: 'Countries Served' },
  { to: 300, suffix: '+', label: 'Pro Products' },
  { to: 500, suffix: 'K+', label: 'Clubs Worldwide' },
];

/** Home 品牌历程摘要 */
export const HERITAGE = [
  'Since 2001, LEAP has grown from a specialized laboratory name into a household brand trusted by millions of players — from the child making a first move to the grandmaster under the spotlight.',
  'Today, our 3D-printed portable series redefines the 64 squares: lighter, more rugged, more personal — equipment as unique as your own playing style.',
];

/** Our Journey 页全文 */
export const JOURNEY_DOC = [
  {
    h: 'Our Heritage: Two Decades of Mastery',
    ps: [
      'The story of LeapSport (leapsport.nl) is not one that started yesterday. Our roots are deeply embedded in the legacy of Leap Industrial Co., Ltd. Since its founding in 2001, Leap has been a global pioneer in the field of professional sports timing and chess equipment.',
      'For over 20 years, the "LEAP" brand has evolved from a specialized laboratory name into a household staple trusted by millions of chess players worldwide. From young students making their first moves to Grandmasters competing under the bright lights of international stages, LEAP timers have witnessed countless moments of strategic brilliance.',
    ],
    bullets: [],
  },
  {
    h: 'Why Choose LeapSport?',
    ps: ['At LeapSport, we do more than just sell equipment; we bridge the gap between world-class manufacturing and the individual needs of the modern player.'],
    bullets: [
      'Deep R&D Foundation: Backed by our parent company’s robust Research & Development center, we hold numerous patents in timing technology. Every clock and chessboard has undergone rigorous stress testing to ensure tournament-grade reliability.',
      'Professional Excellence: Our products are designed to meet the exacting standards of the chess community and are widely used in professional clubs and sanctioned tournaments globally.',
      'Factory-Direct Assurance: Owning our manufacturing facilities means we control quality from the raw material to the final package.',
    ],
  },
  {
    h: 'Innovation: Redefining the 64 Squares',
    ps: ['While we hold a deep respect for the traditions of the "Game of Kings," we refuse to be limited by them. With the launch of leapsport.nl, we have introduced our most ambitious project yet: The 3D-Printed Portable Series.'],
    bullets: [
      'Technology-Driven Design: We utilize cutting-edge 3D printing technology to reimagine the form and function of chess sets—making them lighter, more durable, and perfectly suited for a mobile lifestyle.',
      'Personalized Expression: This technology allows us to offer customization and unique designs that traditional mass-injection molding cannot achieve.',
    ],
  },
  {
    h: 'Our Global Commitment',
    ps: [
      'While we are proudly rooted in our Dutch-facing platform (leapsport.nl), our vision is truly global. Today, our catalog features over 300 professional products, ranging from entry-level educational tools to collector-grade art pieces.',
      'Our mission is simple: To ensure that every chess enthusiast, regardless of where they are in the world, has access to the equipment they need to master the game.',
    ],
    bullets: [],
  },
];

/** 瀑布流节奏：分类内按序循环分配（编辑画廊设计节奏） */
export const RATIOS = ['4/3', '1/1', '4/5', '3/4'];
export const withRatios = (list) => list.map((p, i) => ({ ...p, ratio: RATIOS[i % RATIOS.length] }));
