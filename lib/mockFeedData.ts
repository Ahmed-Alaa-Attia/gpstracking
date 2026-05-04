export type Story = {
  id: string;
  username: string;
  avatarUrl: string;
  seen: boolean;
  isOwn: boolean;
};

export type Post = {
  id: string;
  username: string;
  avatarUrl: string;
  timestamp: string;
  imageUrl: string;
  likes: number;
  caption: string;
};

export const MOCK_STORIES: Story[] = [
  {
    id: "own",
    username: "Your Story",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    seen: false,
    isOwn: true,
  },
  {
    id: "s1",
    username: "ALEX_99",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    seen: false,
    isOwn: false,
  },
  {
    id: "s2",
    username: "SARAH_B",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    seen: true,
    isOwn: false,
  },
  {
    id: "s3",
    username: "MIKE_T",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    seen: true,
    isOwn: false,
  },
  {
    id: "s4",
    username: "JESS",
    avatarUrl: "https://i.pravatar.cc/150?img=20",
    seen: true,
    isOwn: false,
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    username: "ALEX_99",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    timestamp: "3 HOURS AGO",
    imageUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800",
    likes: 1200,
    caption:
      "New personal record on the deadlift. The grind never stops. Fueled by anger and love.",
  },
  {
    id: "p2",
    username: "SARAH_B",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    timestamp: "5 HOURS AGO",
    imageUrl:
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800",
    likes: 856,
    caption:
      "Late night miles hit different. The city is empty and it's just you against the asphalt.",
  },
];
