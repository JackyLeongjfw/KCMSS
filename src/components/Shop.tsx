import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, ShopItem } from '../types';
import { SHOP_ITEMS } from '../constants';
import { ShoppingBag, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ShopProps {
  profile: UserProfile;
}

export default function Shop({ profile }: ShopProps) {
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (item: ShopItem) => {
    if (profile.id === 'guest_user') {
      toast.error("Shop is not available in Guest mode.");
      return;
    }
    const isOwned = profile.inventory.includes(item.id);
    
    if (isOwned) {
      setBuying(item.id);
      try {
        const userRef = doc(db, 'users', profile.id);
        const updates: any = {};
        if (item.category === 'badge') updates.activeBadge = item.icon;
        if (item.category === 'skin') updates.activeSkin = item.icon;
        if (item.category === 'suit') updates.activeSuit = item.icon;
        if (item.category === 'decoration') updates.activeDecoration = item.icon;
        
        await updateDoc(userRef, updates);
        toast.success(`Equipped ${item.name}!`);
      } catch (error) {
        toast.error("Failed to equip item.");
      } finally {
        setBuying(null);
      }
      return;
    }

    if (profile.total_score < item.price) {
      toast.error("Not enough points! Keep learning to earn more.", {
        icon: '💡'
      });
      return;
    }

    setBuying(item.id);
    try {
      const userRef = doc(db, 'users', profile.id);
      const updates: any = {
        total_score: profile.total_score - item.price,
        inventory: arrayUnion(item.id),
      };

      // Auto-equip based on category
      if (item.category === 'badge') updates.activeBadge = item.icon;
      if (item.category === 'skin') updates.activeSkin = item.icon;
      if (item.category === 'suit') updates.activeSuit = item.icon;
      if (item.category === 'decoration') updates.activeDecoration = item.icon;

      await updateDoc(userRef, updates);
      toast.success(`Purchased ${item.name}! ` + (item.category !== 'title' ? 'Equipped for your profile.' : ''));
    } catch (error) {
      toast.error("Purchase failed. Please try again.");
    } finally {
      setBuying(null);
    }
  };

  const categories = ['badge', 'skin', 'suit', 'decoration', 'title', 'avatar'] as const;

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 text-white relative overflow-hidden">
          <ShoppingBag className="absolute -right-8 -bottom-8 h-48 w-48 text-white/10 rotate-12" />
          <div className="relative z-10">
            <h3 className="text-3xl font-black italic tracking-tighter mb-1">DSE Emporium</h3>
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest opacity-80">Premium Gear for Top Scholars</p>
            <div className="mt-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl inline-flex items-center gap-3 border border-white/20 shadow-xl">
              <div className="bg-amber-400 p-1.5 rounded-full ring-4 ring-amber-400/20">
                <Star className="h-5 w-5 fill-amber-900 text-amber-900" />
              </div>
              <div>
                <span className="block text-[10px] text-indigo-200 font-black uppercase tracking-widest leading-none mb-1">Current Balance</span>
                <span className="font-black text-2xl tracking-tighter">{profile.total_score.toLocaleString()} <span className="text-xs">PTS</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-12">
          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{cat}s</h4>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {SHOP_ITEMS.filter(i => i.category === cat).map((item) => {
                  const owned = profile.inventory.includes(item.id);
                  const canAfford = profile.total_score >= item.price;
                  const isEquipped = 
                    (cat === 'badge' && profile.activeBadge === item.icon) ||
                    (cat === 'skin' && profile.activeSkin === item.icon) ||
                    (cat === 'suit' && profile.activeSuit === item.icon) ||
                    (cat === 'decoration' && profile.activeDecoration === item.icon);

                  return (
                    <div 
                      key={item.id}
                      className={cn(
                        "bg-white rounded-3xl p-5 border-2 transition-all flex flex-col items-center text-center group relative overflow-hidden",
                        isEquipped ? "border-indigo-600 bg-indigo-50/50 shadow-indigo-100" : 
                        owned ? "border-slate-100 bg-slate-50" : "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1"
                      )}
                    >
                      {owned && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "text-4xl mb-4 h-20 w-20 flex items-center justify-center rounded-[2rem] shadow-inner transition-transform group-hover:scale-110 relative",
                        owned ? "bg-white" : "bg-slate-50"
                      )}>
                        {item.icon}
                        {isEquipped && (
                          <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full border-2 border-white">
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <h4 className="font-black text-slate-800 text-[11px] leading-tight mb-4 uppercase tracking-tight">{item.name}</h4>
                      
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={isEquipped || buying !== null}
                        className={cn(
                          "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95",
                          isEquipped
                            ? "bg-indigo-600 text-white cursor-default"
                            : buying === item.id 
                              ? "bg-slate-100 text-slate-400" 
                              : owned
                                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100"
                                : canAfford 
                                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200" 
                                  : "bg-slate-100 text-slate-400 border border-slate-200 shadow-none"
                        )}
                      >
                        {isEquipped ? (
                          "Equipped"
                        ) : buying === item.id ? (
                          "Processing..."
                        ) : owned ? (
                          "Equip Item"
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <Star className="h-3 w-3 fill-current" />
                            {item.price} PTS
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            Earn more points by completing quizzes!
          </p>
        </div>
      </div>
    </div>
  );
}
