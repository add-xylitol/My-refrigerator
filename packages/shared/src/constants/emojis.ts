/**
 * Food name → emoji mapping for common Chinese fridge ingredients.
 * Used by inventory cards, recipe cards, and expiry alerts.
 */

export const FOOD_EMOJI_MAP: Record<string, string> = {
  // dairy & eggs
  '牛奶': '🥛', '酸奶': '🥛', '奶酪': '🧀', '黄油': '🧈', '鸡蛋': '🥚',
  // meat & poultry
  '鸡胸肉': '🍗', '鸡肉': '🍗', '鸡腿': '🍗', '鸡翅': '🍗',
  '猪肉': '🥩', '排骨': '🍖', '培根': '🥓', '五花肉': '🥩',
  '牛肉': '🥩', '牛腩': '🥩', '肥牛': '🥩',
  '鱼': '🐟', '三文鱼': '🐟', '带鱼': '🐟',
  '虾': '🦐', '虾仁': '🦐', '大虾': '🦐',
  '蟹': '🦀', '贝': '🐚',
  // vegetables
  '白菜': '🥬', '小白菜': '🥬', '上海青': '🥬', '青菜': '🥬', '菠菜': '🥬',
  '生菜': '🥬', '芹菜': '🥬', '韭菜': '🥬', '油麦菜': '🥬',
  '番茄': '🍅', '西红柿': '🍅',
  '黄瓜': '🥒', '胡萝卜': '🥕', '茄子': '🍆', '玉米': '🌽',
  '土豆': '🥔', '马铃薯': '🥔',
  '洋葱': '🧅', '大蒜': '🧄', '蒜': '🧄', '姜': '🫚',
  '青椒': '🫑', '辣椒': '🌶️', '小米辣': '🌶️',
  '西兰花': '🥦', '花菜': '🥦', '蘑菇': '🍄', '香菇': '🍄', '金针菇': '🍄',
  '豆芽': '🌱', '豆腐': '🫘', '豆干': '🫘', '豆皮': '🫘',
  '南瓜': '🎃', '冬瓜': '🟢', '丝瓜': '🥒', '苦瓜': '🥒',
  // fruits
  '苹果': '🍎', '香蕉': '🍌', '橙子': '🍊', '橘子': '🍊',
  '葡萄': '🍇', '草莓': '🍓', '蓝莓': '🫐', '柠檬': '🍋',
  '西瓜': '🍉', '桃子': '🍑', '梨': '🍐', '芒果': '🥭',
  '猕猴桃': '🥝', '樱桃': '🍒', '柚子': '🍊', '火龙果': '🐉',
  // staples
  '米饭': '🍚', '面条': '🍜', '面粉': '🌾', '面包': '🍞',
  '饺子': '🥟', '包子': '🥟', '馒头': '🥖',
  // drinks
  '啤酒': '🍺', '饮料': '🥤', '茶': '🫖', '咖啡': '☕',
  // condiments (for condiment cards)
  '盐': '🧂', '糖': '🍬', '酱油': '🫗', '生抽': '🫗', '老抽': '🫗',
  '醋': '🍶', '蚝油': '🫗', '橄榄油': '🫒', '花生油': '🫗',
  '胡椒': '🫚', '花椒': '🫚', '八角': '⭐', '蜂蜜': '🍯',
};

/**
 * Get emoji for a food item by fuzzy matching its name against the map.
 * Returns the fallback emoji if no match is found.
 */
export function getFoodEmoji(name: string, fallback = '📦'): string {
  for (const [key, emoji] of Object.entries(FOOD_EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return fallback;
}
