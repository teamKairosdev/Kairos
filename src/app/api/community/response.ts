export interface CommunityPostForResponse {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  likesCount: number;
  createdAt: Date | string;
  isAnonymous: boolean;
  user?: {
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export function toPublicCommunityPost(post: CommunityPostForResponse, viewerId?: string) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category,
    likesCount: post.likesCount,
    createdAt: post.createdAt,
    isAnonymous: post.isAnonymous,
    user: post.isAnonymous || !post.user
      ? null
      : { name: post.user.name, avatarUrl: post.user.avatarUrl },
    isOwner: Boolean(viewerId && post.userId === viewerId),
  };
}
