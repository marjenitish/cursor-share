'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapPin, Phone, ChevronDown, Menu, X } from 'lucide-react';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { createBrowserClient } from '@/lib/supabase/client';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    {
      title: 'About Us',
      items: [
        { href: '/about/who-we-are', label: 'Who We Are' },
        { href: '/about/mission', label: 'Mission and Vision' },
        { href: '/about/board', label: 'SHARE Board' },
        { href: '/about/instructors', label: 'SHARE Instructors' },
        { href: '/about/careers', label: 'Join Our Team' },
        { href: '/events', label: 'Events' },
      ]
    },
    {
      title: 'Classes',
      items: [
        { href: '/exercise-types/d1d461a7-6626-4379-a1e7-650377744fa8', label: 'Gentle Aqua' },
        { href: '/exercise-types/f64b82bf-8ffd-4545-a229-fc7e36a0c89d', label: 'Active & Fit' },
        { href: '/exercise-types/c94fcd75-bd35-420a-9c71-2206ca523921', label: 'Strength, Stretch & Relax' },
        { href: '/exercise-types/9190ce95-0a78-414b-b406-6a01a7df240f', label: 'Tai Chi' },
        { href: '/exercise-types/d329edef-8c00-4fca-a497-f23378f7f627', label: 'Fitter and Stronger' },
        { href: '/exercise-types/432bfd44-e4fb-41e8-b048-a132df8325ca', label: 'Zumba Gold' },
      ]
    },
    {
      title: 'Forms',
      items: [,
        { href: 'https://pfoargdymscqqrekzref.supabase.co/storage/v1/object/public/medical-certificates//enrollment_form.pdf', label: 'Enrollment Form' },
        { href: 'https://pfoargdymscqqrekzref.supabase.co/storage/v1/object/public/medical-certificates//paq_form.pdf', label: 'Pre Activity Questionnaire' },
        { href: 'https://pfoargdymscqqrekzref.supabase.co/storage/v1/object/public/medical-certificates//enrollment_form.pdf', label: 'Bi-Annual Survey Form' }
      ]
    },
    {
      title: 'Enrollment Process',
      items: [
        { href: '/how-to-enroll', label: 'How to Enroll?' },
        { href: '/enrollment-support', label: 'Enrollment Support' },
        { href: '/faq', label: 'FAQ' },
      ]
    },
    {
      title: 'News',
      items: [
        { href: '/news', label: 'Latest News' },
        { href: '/news', label: 'Upcoming Events' },
        { href: '/news', label: 'Blog' },
      ]
    },
  ];

  return (
    <header className="border-b">
      {/* Top Bar */}
      <div className="bg-muted py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="hidden md:flex items-center gap-4">
            <Link href="/find-location" className="text-sm hover:text-primary">Find your local SHARE</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/contact" className="text-sm hover:text-primary">Contact us</Link>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <a href="https://www.facebook.com/sharelearnforlife" className="text-sm hover:text-primary"><Facebook className="h-4 w-4" /></a>
            <a href="https://www.youtube.com/channel/UCfivbREwd88TcwlXvG8PJUA" className="text-sm hover:text-primary"><Youtube className="h-4 w-4" /></a>
            <a href="https://www.linkedin.com/company/share-smr-inc%20/" className="text-sm hover:text-primary"><Linkedin className="h-4 w-4" /></a>
            <a href="mailto:info@share.org.au" className="text-sm hover:text-primary"><Mail className="h-4 w-4" /></a>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
                      <AvatarFallback>{userProfile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{userProfile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />

                  {userProfile?.role === 'instructor' ? (
  <DropdownMenuItem asChild>
    <Link href="/instructor-portal">Instructor Portal</Link>
  </DropdownMenuItem>
) : userProfile?.role === 'admin' ? (
  <DropdownMenuItem asChild>
    <Link href="/dashboard">Dashboard</Link>
  </DropdownMenuItem>
) : (
  <DropdownMenuItem asChild>
    <Link href="/profile">My Profile</Link>
  </DropdownMenuItem>
)}
                  
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="secondary" size="sm" className="hidden sm:inline-flex">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:block">
              <NavigationMenu>
                <NavigationMenuList>
                  {menuItems.map((section) => (
                    <NavigationMenuItem key={section.title}>
                      <NavigationMenuTrigger>{section.title}</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid w-[600px] gap-3 p-4 md:grid-cols-2">
                          <div>
                            <ul className="space-y-2">
                              {section.items.map((item) => (
                                <li key={item.href}>
                                  <NavigationMenuLink asChild>
                                    <Link href={item.href} className="text-sm hover:text-primary">
                                      {item.label}
                                    </Link>
                                  </NavigationMenuLink>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <img
                              src="https://www.homage.com.au/wp-content/uploads/sites/3/2021/09/anupam-mahapatra-Vz0RbclzG_w-unsplash.jpg"
                              alt="Discover Classes"
                              className="rounded-md mb-2 aspect-video object-cover"
                            />
                            <h4 className="text-sm font-medium mb-2">Featured Content</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Discover our range of classes and activities designed for active adults.
                            </p>
                            <Link href="/easy-enroll">
                              <Button variant="outline" size="sm" className="w-full">
                                Enroll Now
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ))}
                  <NavigationMenuItem>
                    <Link href="/contact" legacyBehavior passHref>
                      <NavigationMenuLink className="text-sm hover:text-primary">
                        Contact
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/search">
              <Button variant="outline" size="sm">
                <MapPin className="mr-2 h-4 w-4" />
                Find a Class
              </Button>
            </Link>
            <Button size="sm">
              <Phone className="mr-2 h-4 w-4" />
              Call Us
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div className="space-y-4 flex-1">
                  {menuItems.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <h2 className="text-lg font-semibold">{section.title}</h2>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block py-2 text-sm hover:text-primary"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-4">
                  <Link href="/search" className="w-full">
                    <Button className="w-full" variant="outline">
                      <MapPin className="mr-2 h-4 w-4" />
                      Find a Class
                    </Button>
                  </Link>
                  <Button className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Us
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}