import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CloudArrowUpIcon, 
  CpuChipIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import aadeshAvatar from '../assets/images/aadesh-avatar.jpg';

const HomePage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: CloudArrowUpIcon,
      title: "Multi-Database Support",
      description: "Deploy MySQL, PostgreSQL, MongoDB, and Redis with one click",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: ChartBarIcon,
      title: "Real-time Monitoring",
      description: "Live metrics and performance analytics with beautiful dashboards",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: BoltIcon,
      title: "Lightning Fast",
      description: "Deploy databases in seconds with optimized container orchestration",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Security",
      description: "JWT authentication, rate limiting, and encrypted connections",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: CpuChipIcon,
      title: "Auto-scaling",
      description: "Dynamic resource allocation based on workload demands",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: GlobeAltIcon,
      title: "Cloud Native",
      description: "Kubernetes-ready with Docker support for any environment",
      color: "from-teal-500 to-blue-500"
    }
  ];

  const stats = [
    { number: "4", label: "Database Engines", suffix: "+" },
    { number: "99.9", label: "Uptime", suffix: "%" },
    { number: "< 30", label: "Deploy Time", suffix: "s" },
    { number: "24/7", label: "Monitoring", suffix: "" }
  ];

  const testimonials = [
    {
      quote: "This platform revolutionized our development workflow. We can spin up databases instantly!",
      author: "Aadesh Gulumbe",
      role: "Full-Stack Developer",
      company: "Project Creator",
      avatar: aadeshAvatar
    },
    {
      quote: "The monitoring dashboard gives us insights we never had before. Game changer!",
      author: "Engineering Student",
      role: "NMIET",
      company: "Final Year Project",
      avatar: aadeshAvatar
    },
    {
      quote: "Finally, a DBaaS that actually works as advertised. Clean, fast, reliable.",
      author: "Cloud Enthusiast",
      role: "Technology Innovator",
      company: "Open Source",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CloudArrowUpIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CloudDBaaS</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
              <Link to="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
              <a href="https://github.com/aadesh0706" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">GitHub</a>
              <Link to="/login" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-3"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className={`text-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-white/20 backdrop-blur-sm mb-8">
              <SparklesIcon className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-300 text-sm font-medium">Now with Real-time Monitoring</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Database as a Service
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Deploy, manage, and monitor <span className="text-blue-400 font-semibold">MySQL</span>, 
              <span className="text-green-400 font-semibold"> PostgreSQL</span>, 
              <span className="text-yellow-400 font-semibold"> MongoDB</span>, and 
              <span className="text-red-400 font-semibold"> Redis</span> databases with 
              enterprise-grade performance and security.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                to="/register" 
                className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center"
              >
                Get Started Free
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="group bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 backdrop-blur-sm border border-white/20 flex items-center">
                <PlayIcon className="w-5 h-5 mr-2" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.number}<span className="text-blue-400">{stat.suffix}</span>
                  </div>
                  <div className="text-white/60 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Cards Animation - Hidden on mobile to prevent overlap */}
        <div className="hidden lg:block absolute top-20 left-10 animate-float">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <div className="text-green-400 text-xs font-mono">● MySQL Ready</div>
          </div>
        </div>
        <div className="hidden lg:block absolute top-40 right-10 animate-float-delayed">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <div className="text-blue-400 text-xs font-mono">● PostgreSQL Online</div>
          </div>
        </div>
        <div className="hidden lg:block absolute bottom-40 left-20 animate-float-slow">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <div className="text-yellow-400 text-xs font-mono">● MongoDB Active</div>
          </div>
        </div>
        
        {/* Mobile-friendly status indicators */}
        <div className="lg:hidden flex justify-center items-center space-x-4 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20">
            <div className="text-green-400 text-xs font-mono">● MySQL</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20">
            <div className="text-blue-400 text-xs font-mono">● PostgreSQL</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20">
            <div className="text-yellow-400 text-xs font-mono">● MongoDB</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful Features for Modern Development
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Everything you need to deploy, manage, and scale databases in the cloud with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`group p-8 rounded-2xl border border-white/20 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-white/40 cursor-pointer ${
                  activeFeature === index ? 'bg-white/10 shadow-2xl' : 'bg-white/5'
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} p-4 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
                <div className="mt-6 flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span className="text-sm font-medium">Learn more</span>
                  <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Database Engines Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Choose Your Database Engine
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Support for the most popular database engines with optimized configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "MySQL", version: "8.0", color: "from-blue-500 to-blue-600", logo: "🐬", description: "Reliable relational database" },
              { name: "PostgreSQL", version: "15", color: "from-blue-600 to-indigo-600", logo: "🐘", description: "Advanced SQL database" },
              { name: "MongoDB", version: "7.0", color: "from-green-500 to-green-600", logo: "🍃", description: "Flexible document store" },
              { name: "Redis", version: "7.0", color: "from-red-500 to-red-600", logo: "⚡", description: "High-performance cache" }
            ].map((db, index) => (
              <div key={index} className="group bg-white/5 hover:bg-white/10 rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${db.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {db.logo}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{db.name}</h3>
                <div className="text-white/60 text-sm mb-4">Version {db.version}</div>
                <p className="text-white/70">{db.description}</p>
                <div className="mt-6 flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                  <CheckIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Production Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monitoring Dashboard Preview */}
      <section className="py-32 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Real-time Monitoring Dashboard
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Monitor your databases with live metrics, performance analytics, and beautiful visualizations.
            </p>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl p-8 border border-white/20 backdrop-blur-sm">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/10">
                {/* Mock Dashboard */}
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white">Database Overview</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">Live</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: "Active Connections", value: "247", change: "+12%", color: "text-blue-400" },
                    { label: "CPU Usage", value: "23.5%", change: "-5%", color: "text-green-400" },
                    { label: "Memory Usage", value: "67MB", change: "+8%", color: "text-yellow-400" },
                    { label: "Queries/sec", value: "1.2K", change: "+23%", color: "text-purple-400" }
                  ].map((metric, index) => (
                    <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/10">
                      <div className="text-white/60 text-sm mb-1">{metric.label}</div>
                      <div className={`text-2xl font-bold ${metric.color} mb-1`}>{metric.value}</div>
                      <div className="text-xs text-white/50">{metric.change}</div>
                    </div>
                  ))}
                </div>

                {/* Mock Chart */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Performance Trends</h4>
                    <div className="flex space-x-2">
                      {['1H', '24H', '7D', '30D'].map((period, index) => (
                        <button key={index} className={`px-3 py-1 rounded-lg text-xs font-medium ${index === 1 ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'}`}>
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-40 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-end justify-center">
                    <div className="text-white/60 text-sm">📈 Live Metrics Chart</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Trusted by Developers
            </h2>
            <p className="text-xl text-white/70">
              See what developers are saying about our platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="mb-6">
                  <div className="text-yellow-400 text-lg mb-4">★★★★★</div>
                  <p className="text-white/80 text-lg leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                </div>
                <div className="flex items-center">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="text-white font-semibold">{testimonial.author}</div>
                    <div className="text-white/60 text-sm">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Ready to Deploy Your First Database?
          </h2>
          <p className="text-xl text-white/80 mb-12">
            Created by Aadesh Gulumbe as a comprehensive DBaaS solution for modern developers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="group bg-white hover:bg-white/90 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center"
            >
              Start Building Now
              <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              to="/login" 
              className="bg-transparent hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border border-white/30 hover:border-white/50"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-12 text-white/60 text-sm">
            No credit card required • Free tier available • Deploy in seconds
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <CloudArrowUpIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CloudDBaaS</span>
              </div>
              <p className="text-white/60 text-sm">
                A modern Database-as-a-Service platform created by Aadesh Gulumbe. Built with React, Node.js, and Docker for enterprise-grade database management.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About Creator</a></li>
                <li><a href="https://github.com/aadesh0706" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Source Code</a></li>
                <li><a href="mailto:gulumbe.aadesh2023@nmiet.edu.in" className="hover:text-white transition-colors">Get Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="mailto:gulumbe.aadesh2023@nmiet.edu.in" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="https://github.com/aadesh0706" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Projects</a></li>
                <li><a href="https://linkedin.com/in/aadesh-gulumbe" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Developer</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><span className="text-white/80">Aadesh Gulumbe</span></li>
                <li><span className="text-white/60">Full-Stack Developer</span></li>
                <li><span className="text-white/60">NMIET Student</span></li>
                <li><a href="https://github.com/aadesh0706" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-white/60 text-sm">
                © 2025 CloudDBaaS Platform. Created by Aadesh Gulumbe. All rights reserved.
              </div>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="mailto:gulumbe.aadesh2023@nmiet.edu.in" className="text-white/60 hover:text-white transition-colors">Contact</a>
                <a href="https://github.com/aadesh0706" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">GitHub</a>
                <a href="https://linkedin.com/in/aadesh-gulumbe" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">LinkedIn</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-float-slow {
          animation: float 4s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
