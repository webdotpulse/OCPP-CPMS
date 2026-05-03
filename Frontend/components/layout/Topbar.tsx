import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, User, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Topbar() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { user, logout } = useAuth();

  // Simple breadcrumb logic
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.length > 0 
    ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
    : 'Dashboard';

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-foreground tracking-tight">{breadcrumb}</h2>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/guide" passHref>
          <Button variant="ghost" size="icon" title="Guide">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Guide</span>
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-full pl-2 pr-4">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium">{user?.email || 'Admin'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Role: {user?.role || 'Operator'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
