import { ShopItem } from './types';

export const SHOP_ITEMS: ShopItem[] = [
  // Badges (Elite Tier)
  { id: 'badge_bronze', name: 'Bronze Star', price: 100, icon: '🥉', category: 'badge' },
  { id: 'badge_silver', name: 'Silver Star', price: 500, icon: '🥈', category: 'badge' },
  { id: 'badge_gold', name: 'Gold Star', price: 1000, icon: '🥇', category: 'badge' },
  { id: 'badge_fire', name: 'Streak Fire', price: 2000, icon: '🔥', category: 'badge' },
  { id: 'badge_crown', name: 'English King', price: 5000, icon: '👑', category: 'badge' },
  
  // Skins (Characters)
  { id: 'skin_panda', name: 'Scholar Panda', price: 1200, icon: '🐼', category: 'skin' },
  { id: 'skin_cat', name: 'Library Cat', price: 1200, icon: '🐱', category: 'skin' },
  { id: 'skin_wolf', name: 'Lone Wolf', price: 2500, icon: '🐺', category: 'skin' },
  { id: 'skin_wizard', name: 'Vocab Wizard', price: 4000, icon: '🧙', category: 'skin' },
  
  // Suits (Fanciness)
  { id: 'suit_tux', name: 'Black Tuxedo', price: 800, icon: '🤵', category: 'suit' },
  { id: 'suit_cape', name: 'Hero Cape', price: 1500, icon: '🧥', category: 'suit' },
  { id: 'suit_armor', name: 'Knight Plate', price: 3000, icon: '🛡️', category: 'suit' },
  { id: 'suit_space', name: 'Space Suit', price: 4500, icon: '👩‍🚀', category: 'suit' },

  // Decorations (Backgrounds)
  { id: 'deco_sparkles', name: 'Magic Sparkles', price: 600, icon: '✨', category: 'decoration' },
  { id: 'deco_galaxy', name: 'Galaxy Aura', price: 2000, icon: '🌌', category: 'decoration' },
  { id: 'deco_clouds', name: 'Dreamy Clouds', price: 1000, icon: '☁️', category: 'decoration' },
  
  // Titles & Avatars
  { id: 'title_dse_god', name: 'DSE God', price: 3000, icon: '⚡', category: 'title' },
  { id: 'avatar_eagle', name: 'Eagle Eye', price: 1500, icon: '🦅', category: 'avatar' },
  { id: 'avatar_robot', name: 'AI Scholar', price: 2500, icon: '🤖', category: 'avatar' },
];

export const TEACHER_PASSWORD = "KCMENG2431";
export const PASS_PERCENTAGE = 0.8;
