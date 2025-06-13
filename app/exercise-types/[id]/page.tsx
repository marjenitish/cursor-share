'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Clock, DollarSign, Calendar, Users, Info } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface ExerciseType {
  id: string;
  name: string;
  description: string;
  what_to_bring: string[];
  duration: string;
  cost: number;
  image_link: string;
}

export default function ExerciseTypePage() {
  const params = useParams();
  const [exerciseType, setExerciseType] = useState<ExerciseType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExerciseType = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('exercise_types')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching exercise type:', error);
        return;
      }

      setExerciseType(data);
      setLoading(false);
    };

    fetchExerciseType();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!exerciseType) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">Exercise Type Not Found</h1>
          <p className="text-muted-foreground">The exercise type you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight mb-6">{exerciseType.name}</h1>
            <p className="text-xl text-muted-foreground">
              {exerciseType.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left Column - Image and Details */}
            <div className="space-y-8">
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <img
                  src={exerciseType.image_link || 'https://images.pexels.com/photos/7991159/pexels-photo-7991159.jpeg'}
                  alt={exerciseType.name}
                  className="object-cover w-full h-full"
                />
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-4">
                      <Clock className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">Duration</h3>
                        <p className="text-muted-foreground">{exerciseType.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">Cost</h3>
                        <p className="text-muted-foreground">${exerciseType.cost.toFixed(2)} per session</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - What to Bring and CTA */}
            <div className="space-y-8">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">What to Bring</h2>
                  <ul className="space-y-3">
                    {exerciseType.what_to_bring?.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Ready to Join?</h2>
                  <p className="text-muted-foreground mb-6">
                    Take the first step towards a healthier lifestyle. Join our {exerciseType.name} class today!
                  </p>
                  <div className="space-y-4">
                    <Button size="lg" className="w-full">
                      Enroll Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="lg" className="w-full">
                      View Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Benefits of {exerciseType.name}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Improved Fitness",
                description: "Enhance your overall physical fitness and wellbeing"
              },
              {
                title: "Social Connection",
                description: "Meet new people and build lasting friendships"
              },
              {
                title: "Expert Guidance",
                description: "Learn from qualified and experienced instructors"
              }
            ].map((benefit, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Start Your Journey Today</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community and experience the benefits of regular exercise in a supportive environment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 text-lg px-8">
              Find Available Classes
              <Calendar className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 text-lg px-8">
              Contact Us
              <Users className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 