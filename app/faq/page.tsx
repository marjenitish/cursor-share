'use client';

import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, HelpCircle, Phone, Calendar, CreditCard, Users, Info } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  icon: any;
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');

  const faqs: FAQItem[] = [
    {
      question: "How do I enroll in a class?",
      answer: "You can enroll in classes through our online enrollment system. Visit the 'Easy Enroll' page to browse available classes and complete your enrollment. If you need assistance, our support team is available Monday to Friday at 8424 9400.",
      category: "enrollment",
      icon: Calendar
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, and PayPal. Payment is processed securely through our payment system at the time of enrollment.",
      category: "payment",
      icon: CreditCard
    },
    {
      question: "Can I get a refund if I can't attend a class?",
      answer: "Yes, we offer refunds for cancellations made at least 24 hours before the class. Please contact our support team to process your refund request.",
      category: "payment",
      icon: CreditCard
    },
    {
      question: "What should I bring to my first class?",
      answer: "For most classes, you'll need comfortable workout clothes, a water bottle, and a towel. Some classes may require specific equipment, which will be listed in the class description.",
      category: "general",
      icon: Info
    },
    {
      question: "Are the classes suitable for beginners?",
      answer: "Yes, our classes are designed to accommodate all fitness levels. Our instructors will provide modifications to make exercises easier or more challenging based on your needs.",
      category: "general",
      icon: Users
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team Monday to Friday at 8424 9400, or email us at support@healthylifestyle.com. We aim to respond to all inquiries within 24 hours.",
      category: "support",
      icon: Phone
    }
  ];

  const categories = [
    { id: 'general', name: 'General Questions', icon: Info },
    { id: 'enrollment', name: 'Enrollment', icon: Calendar },
    { id: 'payment', name: 'Payment & Refunds', icon: CreditCard },
    { id: 'support', name: 'Support', icon: Phone }
  ];

  const filteredFaqs = faqs.filter(faq => faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-secondary/10 via-background to-tertiary/10 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary">
              Frequently Asked Questions
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-6">
              Find answers to common questions about our classes, enrollment process, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Category Navigation */}
          <div className="flex flex-wrap gap-4 mb-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
          </div>

          {/* FAQ List */}
          <div className="grid gap-6">
            {filteredFaqs.map((faq, index) => {
              const Icon = faq.icon;
              return (
                <Card key={index} className="bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Icon className="h-6 w-6 text-primary mt-1" />
                      <div>
                        <h3 className="text-xl font-bold mb-3 text-primary">{faq.question}</h3>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-gradient-to-br from-secondary/10 via-background to-tertiary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-primary">Still Have Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our support team is here to help. Don't hesitate to reach out if you need assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 text-lg px-8">
              Contact Support
              <Phone className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 text-lg px-8 hover:bg-primary/10">
              View Enrollment Guide
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 