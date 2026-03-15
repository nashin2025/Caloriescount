'use client';

import { LogOut, Bell, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import { useState, useEffect } from 'react';

interface HeaderProps {
  user: Profile;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const notifs: string[] = [];
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: foodLogs } = await supabase
        .from('food_logs')
        .select('calories')
        .eq('user_id', authUser.id)
        .eq('logged_date', today);

      const totalCalories = foodLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      
      if (user?.daily_calorie_target && totalCalories > user.daily_calorie_target) {
        notifs.push(`You've exceeded your daily calorie limit (${totalCalories} kcal)`);
      } else if (user?.daily_calorie_target && totalCalories >= user.daily_calorie_target * 0.9) {
        notifs.push(`You're close to your daily calorie limit (${totalCalories} kcal / ${user.daily_calorie_target})`);
      }

      const { data: waterLogs } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', authUser.id)
        .eq('logged_date', today);

      const totalWater = waterLogs?.reduce((sum, log) => sum + (log.amount_ml || 0), 0) || 0;
      
      if (user?.water_goal_ml && totalWater < user.water_goal_ml) {
        notifs.push(`Remember to drink water! (${totalWater}ml / ${user.water_goal_ml}ml)`);
      }

      setNotifications(notifs);
    };

    fetchNotifications();
  }, [user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍏</span>
          <span className="font-bold text-lg">CaloriesCount</span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-sm font-semibold">Notifications</div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No new notifications
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <DropdownMenuItem key={index} className="text-sm py-2">
                    {notif}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="font-medium">
                {user.name}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
