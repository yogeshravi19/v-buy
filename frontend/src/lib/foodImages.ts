/**
 * Smart food image mapper — matches item names to high-quality food photos.
 * Uses Unsplash CDN (free, no API key needed for direct image URLs).
 * Falls back to standard placeholder if no match found.
 */

// Curated Unsplash photo IDs for Indian canteen foods
const FOOD_IMAGES: { keywords: string[]; url: string; emoji: string }[] = [
  // ── South Indian ──────────────────────────────────────────────────────────
  {
    keywords: ['idli', 'idly', 'idlies'],
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['dosa', 'dosai', 'uthappam', 'uttapam'],
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['vada', 'medu vada', 'wada'],
    url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['sambar', 'sambhar'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['pongal', 'khichdi'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop&q=80',
  },
  // ── Snacks & Quick Bites ───────────────────────────────────────────────────
  {
    keywords: ['samosa', 'samosas'],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['puff', 'veg puff', 'egg puff'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['cutlet', 'chicken cutlet'],
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['roll', 'paneer roll', 'shawarma', 'chicken shawarma'],
    url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['chole bhature', 'bhature', 'chole'],
    url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['vada pav', 'vadapav', 'vada-pav'],
    url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['pav bhaji', 'pavbhaji'],
    url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['bhajji', 'bhaji', 'pakoda', 'pakora', 'bonda'],
    url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['poha', 'aval'],
    url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['upma', 'uppuma'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['muffin', 'blueberry muffin'],
    url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['cookies', 'biscuit', 'butter cookies'],
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['chips', "lay's", 'lays'],
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['notebook', 'classmate', 'book', 'stationery'],
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=300&fit=crop&q=80',
  },
  // ── Rice / Biryani ─────────────────────────────────────────────────────────
  {
    keywords: ['biryani', 'biriyani', 'briyani'],
    url: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['fried rice', 'egg rice', 'veg rice', 'chicken rice'],
    url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['curd rice', 'curd'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['plain rice', 'steam rice', 'white rice', 'rice'],
    url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['dal', 'dhal', 'lentil'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop&q=80',
  },
  // ── Noodles / Pasta ───────────────────────────────────────────────────────
  {
    keywords: ['noodles', 'chowmein', 'chow mein', 'hakka'],
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['maggi', 'instant noodle'],
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['pasta', 'spaghetti', 'macaroni'],
    url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=300&h=300&fit=crop&q=80',
  },
  // ── Bread / Sandwich ──────────────────────────────────────────────────────
  {
    keywords: ['sandwich', 'grilled sandwich', 'toast sandwich'],
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['paratha', 'parotta', 'parotha'],
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['chapati', 'roti', 'phulka'],
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['bread omelette', 'egg toast'],
    url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=300&h=300&fit=crop&q=80',
  },
  // ── Egg dishes ────────────────────────────────────────────────────────────
  {
    keywords: ['omelette', 'omelet', 'scrambled egg'],
    url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['boiled egg', 'half boil', 'egg'],
    url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=300&h=300&fit=crop&q=80',
  },
  // ── Burgers ───────────────────────────────────────────────────────────────
  {
    keywords: ['burger', 'veggie burger', 'chicken burger', 'aloo burger'],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80',
  },
  // ── Pizza ─────────────────────────────────────────────────────────────────
  {
    keywords: ['pizza'],
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop&q=80',
  },
  // ── Drinks ───────────────────────────────────────────────────────────────
  {
    keywords: ['chai', 'tea', 'masala chai', 'milk tea', 'ginger tea'],
    url: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['coffee', 'filter coffee', 'cappuccino', 'latte'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['juice', 'fresh juice', 'orange juice', 'mosambi', 'lime juice'],
    url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['lassi', 'buttermilk', 'chaas'],
    url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['milkshake', 'shake', 'smoothie'],
    url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['water', 'mineral water'],
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop&q=80',
  },
  // ── Sweets / Desserts ─────────────────────────────────────────────────────
  {
    keywords: ['halwa', 'sooji halwa', 'rava halwa'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['gulab jamun', 'gulabjamun'],
    url: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['rasgulla', 'rosogolla', 'rasgulla'],
    url: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['fruit salad', 'fruit'],
    url: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['watermelon', 'watermelon juice'],
    url: 'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['pineapple', 'pineapple juice'],
    url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['sundae', 'chocolate sundae', 'cone', 'softy'],
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['flavored milk', 'badam milk', 'pista', 'badam'],
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['chicken 65', 'chilli chicken', 'chili chicken'],
    url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['lemon rice'],
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['kheer', 'payasam', 'payasa'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['ice cream', 'icecream', 'kulfi'],
    url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop&q=80',
  },
  // ── Curry / Mains ─────────────────────────────────────────────────────────
  {
    keywords: ['paneer', 'palak paneer', 'butter paneer', 'shahi paneer'],
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['chicken', 'chicken curry', 'butter chicken', 'chicken gravy'],
    url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['fish', 'fish curry', 'fish fry'],
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['soup'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop&q=80',
  },
  {
    keywords: ['manchurian', 'gobi manchurian'],
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop&q=80',
  },
]

// Category fallback images
const CATEGORY_IMAGES: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=300&fit=crop&q=80',
  lunch:     'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop&q=80',
  dinner:    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&h=300&fit=crop&q=80',
  snacks:    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=300&fit=crop&q=80',
  drinks:    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&h=300&fit=crop&q=80',
  beverages: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop&q=80',
  desserts:  'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop&q=80',
  sweets:    'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=300&h=300&fit=crop&q=80',
  general:   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80',
}

/**
 * Returns { url, emoji } for a given food item name + category.
 * Tries exact keyword match first, then category fallback, then generic.
 */
export function getFoodImage(name: string, category = 'General'): { url: string; emoji: string } {
  const lower = name.toLowerCase()

  // Try exact food keyword match
  for (const entry of FOOD_IMAGES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { url: entry.url, emoji: '' }
    }
  }

  // Category fallback
  const catLower = category.toLowerCase()
  for (const [cat, url] of Object.entries(CATEGORY_IMAGES)) {
    if (catLower.includes(cat)) {
      return { url, emoji: '' }
    }
  }

  // Generic fallback
  return {
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80',
  }
}

/**
 * Returns just the emoji for compact display.
 */
export function getFoodEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const entry of FOOD_IMAGES) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.emoji
  }
  return ''
}
