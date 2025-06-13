'use client';

import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EnrollmentSupportPage() {


    const router = useRouter();
    return (
        <div className="min-h-screen bg-background">
            <Navigation />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-secondary/10 via-background to-tertiary/10 py-12 md:py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary">
                            Enrollment Support
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground mt-6">
                            Enrolling online is the safest and most efficient method to access Healthy Lifestyle classes.
                        </p>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Support Information */}
                        <div className="space-y-8">
                            <Card className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <HelpCircle className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 text-primary">Need Help Enrolling?</h2>
                                            <p className="text-muted-foreground mb-6">
                                                Our friendly team is available to help participants learn and navigate the online enrollment platform.
                                                We're here to make your enrollment process smooth and stress-free.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <Phone className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 text-primary">Contact Support</h2>
                                            <p className="text-muted-foreground mb-4">
                                                If you require support enrolling online, please contact our Technology Support line:
                                            </p>
                                            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                                                <Phone className="h-5 w-5" />
                                                <span>8424 9400</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <Clock className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 text-primary">Support Hours</h2>
                                            <p className="text-muted-foreground">
                                                Our support team is available Monday to Friday during the enrollment period.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Quick Links */}
                        <div className="space-y-8">
                            <Card className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                                <CardContent className="pt-6">
                                    <h2 className="text-2xl font-bold mb-6 text-primary">Quick Links</h2>
                                    <div className="space-y-4">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between hover:bg-primary/10"
                                            size="lg"
                                            onClick={() => router.push('/easy-enroll')}>
                                            View Available Classes
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                        <Button variant="outline"
                                            className="w-full justify-between hover:bg-primary/10"
                                            size="lg"
                                            onClick={() => router.push('/how-to-enroll')}>
                                            Enrollment Guide
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                        <Button variant="outline"
                                            className="w-full justify-between hover:bg-primary/10"
                                            size="lg"
                                            onClick={() => router.push('/faq')}>
                                            FAQ
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                                <CardContent className="pt-6">
                                    <h2 className="text-2xl font-bold mb-4 text-primary">Why Enroll Online?</h2>
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            <span className="text-muted-foreground">Secure and efficient enrollment process</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            <span className="text-muted-foreground">Instant confirmation of your enrollment</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            <span className="text-muted-foreground">Easy access to class schedules and updates</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            <span className="text-muted-foreground">Convenient payment options</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 bg-gradient-to-br from-secondary/10 via-background to-tertiary/10">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-6 text-primary">Ready to Get Started?</h2>
                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Our support team is here to help you every step of the way. Don't hesitate to reach out if you need assistance.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="h-14 text-lg px-8">
                            Browse Classes
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 text-lg px-8 hover:bg-primary/10">
                            Contact Support
                            <Phone className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
} 