/**
 * CommentsPanel - Shows and manages comments for a task
 */

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/use-supabase';
import { PriorityComment, PriorityCommentInsert } from '@/types/daily-priorities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from '@/contexts/use-auth';
import { getDisplayName } from '@/config/users';

interface CommentsPanelProps {
  priorityId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsPanel({ priorityId, isOpen, onClose, onCommentAdded }: CommentsPanelProps) {
  const { supabase } = useSupabase();
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<PriorityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('priority_comments')
        .select('*')
        .eq('priority_id', priorityId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
      } else {
        setComments(data || []);
      }
      setIsLoading(false);
    };

    fetchComments();
  }, [supabase, priorityId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSending(true);
    const commentData: PriorityCommentInsert = {
      priority_id: priorityId,
      comment: newComment.trim(),
      created_by: currentUser?.id || null
    };

    const { data, error } = await supabase
      .from('priority_comments')
      .insert(commentData)
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
    } else if (data) {
      setComments([...comments, data]);
      setNewComment('');
      onCommentAdded?.(); // Notify parent that a comment was added
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Comments List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No comments yet</p>
            ) : (
              comments.map((comment) => {
                const utcDate = new Date(comment.created_at);
                const pacificDate = toZonedTime(utcDate, 'America/Los_Angeles');
                const formattedDate = format(pacificDate, 'MMM d, yyyy h:mm a');

                return (
                  <div key={comment.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDisplayName(comment.created_by)} · {formattedDate} PT
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... (Cmd/Ctrl+Enter to send)"
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSending}
                size="sm"
              >
                <Send className="h-3 w-3 mr-1" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
