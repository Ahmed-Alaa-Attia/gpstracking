import { MOCK_POSTS, MOCK_STORIES } from "@/lib/mockFeedData";

describe("mockFeedData", () => {
  it("has at least 3 stories with isOwn first", () => {
    expect(MOCK_STORIES.length).toBeGreaterThanOrEqual(3);
    expect(MOCK_STORIES[0].isOwn).toBe(true);
  });

  it("has at least 2 posts", () => {
    expect(MOCK_POSTS.length).toBeGreaterThanOrEqual(2);
  });

  it("each post has required fields", () => {
    MOCK_POSTS.forEach((post) => {
      expect(post.id).toBeDefined();
      expect(post.username).toBeDefined();
      expect(post.imageUrl).toBeDefined();
      expect(typeof post.likes).toBe("number");
    });
  });
});
