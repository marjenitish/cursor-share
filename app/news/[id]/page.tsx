'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Share2, Calendar, User, Tag, Image as ImageIcon } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

type NewsCategory = {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    tags: string[];
    is_featured: boolean;
};

type NewsArticle = {
    id: string;
    category_id: string;
    date: string;
    author: string;
    banner_image_link: string | null;
    alt_image_link: string | null;
    published_date: string | null;
    is_published: boolean;
    title: string;
    subtitle: string | null;
    description: string;
    tags: string[];
    is_featured: boolean;
    gallery_images: string[] | null;
    button_link: string | null;
    created_at: string;
    updated_at: string;
    category?: NewsCategory;
};

export default function NewsDetailPage() {
    const params = useParams();
    const [news, setNews] = useState<NewsArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createBrowserClient();

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const { data, error } = await supabase
                    .from('news_articles')
                    .select(`
                        *,
                        category:news_categories(*)
                    `)
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                setNews(data);
            } catch (err) {
                console.error('Error fetching news:', err);
                setError('Failed to load news article');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchNews();
        }
    }, [params.id, supabase]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="container mx-auto px-4 py-12">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-pulse space-y-4 w-full max-w-3xl">
                            <div className="h-8 bg-muted rounded w-3/4"></div>
                            <div className="h-4 bg-muted rounded w-1/4"></div>
                            <div className="h-64 bg-muted rounded"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-muted rounded"></div>
                                <div className="h-4 bg-muted rounded"></div>
                                <div className="h-4 bg-muted rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !news) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="container mx-auto px-4 py-12">
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
                        <p className="text-muted-foreground mb-8">{error || 'News article not found'}</p>
                        <Link href="/news">
                            <Button>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to News
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navigation />
            
            {/* Hero Section */}
            <section className="relative bg-muted/30 py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <Link href="/news">
                            <Button variant="ghost" className="mb-6">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to News
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-bold tracking-tight mb-4">{news.title}</h1>
                        {news.subtitle && (
                            <p className="text-xl text-muted-foreground mb-4">{news.subtitle}</p>
                        )}
                        <div className="flex items-center gap-6 text-muted-foreground mb-8">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(news.date), 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{news.author}</span>
                            </div>
                            {news.category && (
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                                        {news.category.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        {news.banner_image_link && (
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
                                <img
                                    src={news.banner_image_link}
                                    alt={news.title}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        )}
                        
                        <div className="prose prose-lg max-w-none">
                            <div 
                                className="text-xl text-muted-foreground mb-8"
                                dangerouslySetInnerHTML={{ __html: news.description }}
                            />
                            
                            {news.tags && news.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {news.tags.map((tag, index) => (
                                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                                            <Tag className="h-3 w-3" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {news.gallery_images && news.gallery_images.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 my-8">
                                    {news.gallery_images.map((image, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                                            <img
                                                src={image}
                                                alt={`Gallery image ${index + 1}`}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {news.button_link && (
                                <div className="mt-8">
                                    <Link href={news.button_link}>
                                        <Button size="lg">
                                            Learn More
                                            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="mt-12 pt-8 border-t">
                            <div className="flex items-center justify-between">
                                <Link href="/news">
                                    <Button variant="outline">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to News
                                    </Button>
                                </Link>
                                <Button variant="ghost">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share Article
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Related News Section */}
            <section className="py-12 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8">More News</h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {/* Add related news cards here */}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
} 