import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Eye, ThumbsUp, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import { getInternalApiUrl } from '@/lib/api-config';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `${username}'s Threads - YoForex Forum`,
    description: `View all forum threads created by ${username} on YoForex`,
  };
}

export default async function UserThreadsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const EXPRESS_URL = getInternalApiUrl();
  
  // First get user info to get userId
  let user = null;
  let threads = [];
  
  try {
    // Get user profile to get the userId
    const profileRes = await fetch(`${EXPRESS_URL}/api/user/${username}/profile`, { 
      cache: 'no-store',
    });
    
    if (!profileRes.ok) {
      notFound();
    }
    
    const profileData = await profileRes.json();
    user = profileData?.user;
    
    if (!user) {
      notFound();
    }
    
    // Now fetch threads using userId
    const threadsRes = await fetch(`${EXPRESS_URL}/api/user/${user.id}/threads`, {
      cache: 'no-store',
    });
    
    if (threadsRes.ok) {
      threads = await threadsRes.json();
    }
  } catch (error) {
    console.error('Error fetching user threads:', error);
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href={`/user/${username}`}>
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Threads by {username}</h1>
                <p className="text-muted-foreground mt-2">
                  {threads.length} {threads.length === 1 ? 'thread' : 'threads'} created
                </p>
              </div>
            </div>
          </div>

          {/* Threads List */}
          {threads.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No threads yet</h3>
                <p className="text-muted-foreground">
                  {username} hasn't created any threads yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {threads.map((thread: any) => (
                <Card key={thread.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {thread.categorySlug && (
                            <Badge variant="secondary">
                              {thread.categorySlug.replace(/-/g, ' ')}
                            </Badge>
                          )}
                          {thread.status === 'pinned' && (
                            <Badge variant="default">Pinned</Badge>
                          )}
                          {thread.status === 'solved' && (
                            <Badge variant="success" className="bg-green-500">Solved</Badge>
                          )}
                        </div>
                        
                        <Link 
                          href={`/thread/${thread.slug}`}
                          className="text-xl font-semibold hover:text-primary transition-colors"
                        >
                          {thread.title}
                        </Link>
                        
                        <p className="text-muted-foreground mt-2 line-clamp-2">
                          {thread.body?.replace(/<[^>]*>/g, '')}
                        </p>
                        
                        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {thread.views || 0} views
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {thread.replyCount || 0} replies
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            {thread.likeCount || 0} likes
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <EnhancedFooter />
    </>
  );
}