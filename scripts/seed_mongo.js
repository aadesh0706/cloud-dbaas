// Seed script for blog_db
const bdb = db.getSiblingDB("blog_db");

bdb.users.deleteMany({});
bdb.categories.deleteMany({});
bdb.posts.deleteMany({});
bdb.comments.deleteMany({});

bdb.users.insertMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
  { name: "Carol", email: "carol@example.com" }
]);

bdb.categories.insertMany([
  { name: "Tech" },
  { name: "Life" },
  { name: "Travel" }
]);

const alice = bdb.users.findOne({ email: "alice@example.com" });
const bob = bdb.users.findOne({ email: "bob@example.com" });
const tech = bdb.categories.findOne({ name: "Tech" });
const life = bdb.categories.findOne({ name: "Life" });

bdb.posts.insertMany([
  { title: "Intro to Tech", content: "Tech intro", authorId: alice._id, categoryId: tech._id },
  { title: "Life Hacks", content: "Life hacks", authorId: bob._id, categoryId: life._id },
  { title: "More Tech", content: "Advanced topics", authorId: alice._id, categoryId: tech._id }
]);

const post1 = bdb.posts.findOne({ title: "Intro to Tech" });
const post2 = bdb.posts.findOne({ title: "Life Hacks" });

bdb.comments.insertMany([
  { postId: post1._id, userId: bob._id, content: "Great read" },
  { postId: post1._id, userId: alice._id, content: "Thanks!" },
  { postId: post2._id, userId: alice._id, content: "Nice tips" }
]);

print("Inserted sample blog_db relational data.");
