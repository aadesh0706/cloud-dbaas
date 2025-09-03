import React from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  CodeBracketIcon,
  StarIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';

const AboutPage = () => {
  const skills = [
    'React.js', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Docker', 'Kubernetes', 'AWS', 'JavaScript', 'TypeScript', 'Python',
    'Git', 'CI/CD', 'Microservices', 'REST APIs', 'GraphQL', 'Redis'
  ];

  const projects = [
    {
      name: 'Cloud DBaaS Platform',
      description: 'A comprehensive Database-as-a-Service platform with multi-database support, real-time monitoring, and enterprise security.',
      tech: ['React', 'Node.js', 'Docker', 'PostgreSQL', 'JWT'],
      status: 'Active'
    },
    {
      name: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration, inventory management, and analytics.',
      tech: ['MERN Stack', 'Stripe', 'Redux', 'Material-UI'],
      status: 'Completed'
    },
    {
      name: 'Task Management System',
      description: 'Collaborative project management tool with real-time updates and team collaboration features.',
      tech: ['Vue.js', 'Socket.io', 'Express', 'MongoDB'],
      status: 'Completed'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DB</span>
              </div>
              <span className="text-white font-semibold text-lg">CloudDBaaS</span>
            </Link>
            <Link
              to="/"
              className="text-white/80 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative mb-8">
            {/* Profile Image Placeholder - Replace with your actual image */}
            {/* <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mb-6">
              AG
            </div> */}
            {/* Uncomment and replace with your actual image */}
            <img 
              src="/src/assets/images/aadesh-profile.jpg" 
              alt="Aadesh Gulumbe" 
              className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-white/20"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Aadesh Gulumbe
          </h1>
          <p className="text-xl text-purple-200 mb-6">
            Full-Stack Developer & Cloud Enthusiast
          </p>
          <div className="flex justify-center items-center space-x-2 text-white/60 mb-8">
            <MapPinIcon className="w-5 h-5" />
            <span>Maharashtra, India</span>
          </div>
          
          {/* Social Links */}
          <div className="flex justify-center space-x-6">
            <a 
              href="https://github.com/aadesh0706" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              <FaGithub className="w-8 h-8" />
            </a>
            <a 
              href="https://linkedin.com/in/aadesh-gulumbe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              <FaLinkedin className="w-8 h-8" />
            </a>
            <a 
              href="mailto:gulumbe.aadesh2023@nmiet.edu.in" 
              className="text-white/60 hover:text-white transition-colors"
            >
              <EnvelopeIcon className="w-8 h-8" />
            </a>
            {/* Add your Twitter, Instagram or other social links */}
            {/* <a 
              href="https://twitter.com/your-handle" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              <FaTwitter className="w-8 h-8" />
            </a> */}
          </div>
        </div>

        {/* About Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">About Me</h2>
            <p className="text-white/80 leading-relaxed mb-6">
              I'm a passionate Full-Stack Developer currently pursuing my engineering degree at NMIET. 
              I specialize in building modern web applications with a focus on scalability, performance, 
              and user experience. My expertise spans across frontend and backend technologies, 
              cloud platforms, and database management.
            </p>
            <p className="text-white/80 leading-relaxed mb-6">
              I love working on challenging projects that solve real-world problems. This Cloud DBaaS 
              Platform is one of my major projects where I've implemented enterprise-level features 
              like multi-database support, real-time monitoring, and secure authentication systems.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-purple-300">
                <AcademicCapIcon className="w-5 h-5" />
                <span>Engineering Student</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-300">
                <CodeBracketIcon className="w-5 h-5" />
                <span>Full-Stack Developer</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="w-5 h-5 text-purple-400" />
                <a 
                  href="mailto:gulumbe.aadesh2023@nmiet.edu.in"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  gulumbe.aadesh2023@nmiet.edu.in
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <FaGithub className="w-5 h-5 text-purple-400" />
                <a 
                  href="https://github.com/aadesh0706"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  github.com/aadesh0706
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <FaLinkedin className="w-5 h-5 text-purple-400" />
                <a 
                  href="https://linkedin.com/in/aadesh-gulumbe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  linkedin.com/in/aadesh-gulumbe
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <MapPinIcon className="w-5 h-5 text-purple-400" />
                <span className="text-white/80">Maharashtra, India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Technical Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {skills.map((skill, index) => (
              <div 
                key={index}
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center border border-white/10"
              >
                <span className="text-white text-sm">{skill}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Featured Projects</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'Active' 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-white/70 text-sm mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, techIndex) => (
                    <span 
                      key={techIndex}
                      className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Let's Work Together</h2>
          <p className="text-white/80 mb-6">
            I'm always interested in new opportunities and exciting projects. 
            Feel free to reach out if you'd like to collaborate!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:gulumbe.aadesh2023@nmiet.edu.in"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Get In Touch
            </a>
            <a 
              href="https://github.com/aadesh0706"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors border border-white/20"
            >
              View My Work
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
