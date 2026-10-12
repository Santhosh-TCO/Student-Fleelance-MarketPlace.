/* Seed data for the demo. Everything lives in localStorage (see app.js),
   which stands in for the REST API + database described in the project report. */

const CATEGORIES = [
  { id: 'web',     name: 'Web Development', icon: '💻' },
  { id: 'design',  name: 'Graphic Design',  icon: '🎨' },
  { id: 'writing', name: 'Content Writing', icon: '✍️' },
  { id: 'data',    name: 'Data & Excel',    icon: '📊' },
  { id: 'video',   name: 'Video & Audio',   icon: '🎬' },
  { id: 'ai',      name: 'Python & AI',     icon: '🤖' },
  { id: 'tutor',   name: 'Tutoring',        icon: '📚' }
];

function seedDB() {
  const d = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const users = [
    { id: 'u_aarav',  role: 'student', name: 'Aarav Krishnan',  email: 'aarav@demo.com',  password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Information Technology', year: 'III Year',
      bio: 'Front-end enthusiast who builds fast, responsive websites for small businesses and campus clubs.', skills: ['HTML', 'CSS', 'JavaScript', 'React'], portfolio: 'https://github.com/' },
    { id: 'u_meena',  role: 'student', name: 'Meena Lakshmi',   email: 'meena@demo.com',  password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Information Technology', year: 'II Year',
      bio: 'Logo, poster and social-media designer. I love clean layouts and bold colours.', skills: ['Figma', 'Photoshop', 'Branding', 'Posters'], portfolio: 'https://www.behance.net/' },
    { id: 'u_karthik',role: 'student', name: 'Karthik Raja',    email: 'karthik@demo.com',password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Computer Science', year: 'III Year',
      bio: 'Technical and blog writer. I turn complicated topics into plain, readable English and Tamil.', skills: ['Blogs', 'SEO', 'Technical Writing', 'Proofreading'], portfolio: 'https://medium.com/' },
    { id: 'u_divya',  role: 'student', name: 'Divya Bharathi',  email: 'divya@demo.com',  password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Information Technology', year: 'IV Year',
      bio: 'Excel and data-cleaning specialist. Dashboards, pivot tables and tidy reports.', skills: ['Excel', 'Google Sheets', 'Power BI', 'Data Entry'], portfolio: '' },
    { id: 'u_rahul',  role: 'student', name: 'Rahul Venkat',    email: 'rahul@demo.com',  password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Electronics', year: 'II Year',
      bio: 'Short-form video editor for reels, shorts and event highlights.', skills: ['Premiere Pro', 'DaVinci Resolve', 'Reels', 'Subtitles'], portfolio: 'https://www.youtube.com/' },
    { id: 'u_sneha',  role: 'student', name: 'Sneha Priya',     email: 'sneha@demo.com',  password: 'demo123', college: 'Meenakshi Sundararajan Engineering College', dept: 'Information Technology', year: 'IV Year',
      bio: 'Python developer working on automation scripts and beginner-friendly machine learning projects.', skills: ['Python', 'Pandas', 'scikit-learn', 'Automation'], portfolio: 'https://github.com/' },
    { id: 'u_brew',   role: 'client',  name: 'BrewBox Café',    email: 'client@demo.com', password: 'demo123', bio: 'A neighbourhood café in Thanjavur looking for creative help with our menu, social media and website.' },
    { id: 'u_green',  role: 'client',  name: 'GreenLeaf NGO',   email: 'ngo@demo.com',    password: 'demo123', bio: 'We run tree-planting and awareness drives across Tamil Nadu and need volunteers-for-hire with digital skills.' }
  ];

  const services = [
    { id: 's1', studentId: 'u_aarav',  category: 'web',     title: 'I will build a responsive portfolio or business website', desc: 'A clean, mobile-friendly site (up to 5 pages) written in HTML, CSS and JavaScript. Includes contact form and basic SEO.', price: 2500, days: 5, date: d(12) },
    { id: 's2', studentId: 'u_aarav',  category: 'web',     title: 'I will fix bugs and improve your existing React or JS app', desc: 'Send me the repo and a list of issues. I will debug, refactor and document what I changed.', price: 1200, days: 3, date: d(9) },
    { id: 's3', studentId: 'u_meena',  category: 'design',  title: 'I will design a logo and mini brand kit', desc: 'Three logo concepts, colour palette and font pairing delivered as PNG, SVG and a one-page guide.', price: 1500, days: 4, date: d(11) },
    { id: 's4', studentId: 'u_meena',  category: 'design',  title: 'I will create posters and social-media banners', desc: 'Event posters, Instagram posts and WhatsApp status graphics in your brand colours.', price: 600, days: 2, date: d(6) },
    { id: 's5', studentId: 'u_karthik',category: 'writing', title: 'I will write SEO-friendly blog posts (800 words)', desc: 'Researched, original articles with headings, meta description and keywords. Tamil or English.', price: 700, days: 3, date: d(10) },
    { id: 's6', studentId: 'u_divya',  category: 'data',    title: 'I will clean your data and build an Excel dashboard', desc: 'Remove duplicates, fix formats and turn raw sheets into charts and pivot tables you can reuse.', price: 900, days: 3, date: d(8) },
    { id: 's7', studentId: 'u_rahul',  category: 'video',   title: 'I will edit reels and shorts with captions', desc: 'Up to 60 seconds of vertical video with cuts, transitions, music sync and subtitles.', price: 500, days: 2, date: d(5) },
    { id: 's8', studentId: 'u_sneha',  category: 'ai',      title: 'I will automate a boring task with a Python script', desc: 'File renaming, web scraping, Excel reports, email sending – tell me the task and I will script it.', price: 1100, days: 4, date: d(7) },
    { id: 's9', studentId: 'u_sneha',  category: 'tutor',   title: 'I will tutor you in Python basics (4 sessions)', desc: 'Four one-hour online sessions for beginners with exercises and notes.', price: 800, days: 7, date: d(3) }
  ];

  const jobs = [
    { id: 'j1', clientId: 'u_brew',  category: 'design',  title: 'Menu board and Instagram highlight icons', desc: 'Need a printable A3 menu board plus 8 matching Instagram highlight covers. Brand colours are brown and cream.', budget: 2000, deadline: '2 weeks', status: 'open', date: d(4) },
    { id: 'j2', clientId: 'u_brew',  category: 'web',     title: 'One-page website with online menu', desc: 'A simple mobile-first site with opening hours, menu, location map and a WhatsApp order button.', budget: 3500, deadline: '3 weeks', status: 'open', date: d(2) },
    { id: 'j3', clientId: 'u_green', category: 'video',   title: 'Edit a 2-minute tree-planting drive video', desc: 'We have raw footage from our last drive. Need a short, emotional edit with Tamil subtitles for social media.', budget: 1500, deadline: '10 days', status: 'open', date: d(3) },
    { id: 'j4', clientId: 'u_green', category: 'writing', title: 'Write 5 awareness posts on waste segregation', desc: 'Short posts (120 words each) in simple Tamil with English captions for Instagram and WhatsApp.', budget: 1000, deadline: '1 week', status: 'open', date: d(1) },
    { id: 'j5', clientId: 'u_green', category: 'data',    title: 'Clean volunteer registration sheet', desc: 'About 800 rows of messy volunteer data. Need duplicates removed, phone numbers formatted and a summary by district.', budget: 800, deadline: '5 days', status: 'open', date: d(1) }
  ];

  const reviews = [
    { id: 'r1', orderId: 'o_seed1', reviewerId: 'u_brew',  studentId: 'u_meena',  rating: 5, text: 'Meena delivered a beautiful logo ahead of schedule and handled every revision cheerfully.', date: d(20) },
    { id: 'r2', orderId: 'o_seed2', reviewerId: 'u_green', studentId: 'u_aarav',  rating: 5, text: 'Our donation page looks professional and works perfectly on phones. Highly recommended.', date: d(18) },
    { id: 'r3', orderId: 'o_seed3', reviewerId: 'u_brew',  studentId: 'u_karthik',rating: 4, text: 'Well-researched blog posts. Needed one small tone change, which Karthik fixed the same day.', date: d(15) },
    { id: 'r4', orderId: 'o_seed4', reviewerId: 'u_green', studentId: 'u_divya',  rating: 5, text: 'Divya turned a chaotic sheet into a clear dashboard. Saved us hours.', date: d(14) },
    { id: 'r5', orderId: 'o_seed5', reviewerId: 'u_brew',  studentId: 'u_rahul',  rating: 4, text: 'Snappy reels with good music timing. Great for a first-year student!', date: d(10) }
  ];

  return {
    version: 1,
    users, services, jobs, reviews,
    applications: [],
    orders: [],
    payments: [],
    messages: [
      { id: 'm1', from: 'u_brew', to: 'u_meena', text: 'Hi Meena, are you free to design our new menu board this month?', date: d(2) },
      { id: 'm2', from: 'u_meena', to: 'u_brew', text: 'Hello! Yes, I can start this week. Could you share your brand colours?', date: d(2) }
    ],
    session: null
  };
}
