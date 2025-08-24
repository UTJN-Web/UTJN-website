# UTJN - University of Toronto Japanese Network

A comprehensive web platform for the University of Toronto Japanese Network, providing event management, user registration, payment processing, and community features for Japanese students and alumni.

## 🌟 Features

### 🎯 User Features

#### **Authentication & User Management**
- **User Registration**: Email-based signup with AWS Cognito integration
- **Email Verification**: Secure email confirmation system
- **Password Reset**: Forgot password functionality with email verification
- **User Profiles**: Complete profile management with academic information
- **Session Management**: Persistent login sessions with localStorage

#### **Event System**
- **Event Discovery**: Browse and search events by category (Social/Career)
- **Advanced Ticketing**: Multi-tier pricing system (Early Bird → Regular)
- **Automatic Tier Progression**: Seamless transition when Early Bird sells out
- **Event Registration**: Free and paid event registration
- **Payment Integration**: Square payment processing for paid events
- **Credit System**: User credits for event discounts
- **Registration Management**: View and cancel registrations
- **Refund System**: Automated refund processing

#### **Event Types & Categories**
- **Social Events**: Networking, cultural events, parties
- **Career Events**: Job fairs, workshops, professional development
- **Target Year Filtering**: Events filtered by academic year
- **University Restrictions**: UofT-only events for students

#### **Gallery & Media**
- **Event Galleries**: Photo galleries organized by event and year
- **Image Management**: Automatic image optimization and storage
- **Event Memories**: Historical event documentation

#### **Community Features**
- **Contact Forms**: Direct communication with organizers
- **Blog Integration**: Torontonians blog integration
- **Social Media**: Facebook, Instagram, TikTok integration
- **Newsletter**: Email communication system

### 🔧 Admin Features

#### **Event Management**
- **Event Creation**: Comprehensive event setup with advanced options
- **Advanced Ticketing Configuration**: Multi-tier pricing setup
- **Image Upload**: Event image management with preview
- **Event Editing**: Full event modification capabilities
- **Event Archiving**: Archive/restore events
- **Event Deletion**: Permanent event removal

#### **Registration Management**
- **Participant Tracking**: View registered participants
- **Registration Analytics**: Registration statistics and trends
- **Capacity Management**: Real-time capacity monitoring
- **Waitlist Management**: Automatic waitlist handling

#### **User Administration**
- **User Management**: View and manage all users
- **Permission System**: Role-based access control
- **User Analytics**: User engagement metrics
- **Profile Management**: Admin user profile editing

#### **Financial Management**
- **Payment Processing**: Square payment integration
- **Refund Management**: Process and track refunds
- **Financial Analytics**: Revenue and payment statistics
- **Credit System Management**: User credit administration

#### **Form Management**
- **Custom Forms**: Create and manage registration forms
- **Form Submissions**: View and process form responses
- **QR Code Generation**: QR codes for event check-in
- **Form Analytics**: Submission statistics

#### **Analytics Dashboard**
- **Event Analytics**: Comprehensive event statistics
- **User Analytics**: User engagement and behavior
- **Financial Analytics**: Revenue and payment tracking
- **System Statistics**: Platform usage metrics

### 🛠 Technical Features

#### **Frontend**
- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first responsive layout
- **Progressive Web App**: PWA capabilities

#### **Backend**
- **FastAPI**: High-performance Python web framework
- **PostgreSQL**: Relational database with Prisma ORM
- **AWS Integration**: Cognito, Secrets Manager, RDS
- **Async Processing**: Non-blocking operations
- **RESTful APIs**: Comprehensive API endpoints

#### **Payment & Security**
- **Square Payments**: Secure payment processing
- **AWS Cognito**: User authentication and authorization
- **JWT Tokens**: Secure session management
- **HTTPS**: Encrypted data transmission
- **Input Validation**: Comprehensive data validation

#### **DevOps & Deployment**
- **Docker**: Containerized development and deployment
- **Docker Compose**: Multi-service orchestration
- **Environment Management**: Flexible configuration
- **Hot Reloading**: Development with live updates
- **Error Handling**: Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- Docker & Docker Compose
- AWS Account (for Cognito, RDS, Secrets Manager)
- Square Developer Account (for payments)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/UTJN-Web/UTJN-website.git
cd UTJN-website
```

2. **Environment Variables**
Create a `.env` file with the following variables:
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-2

# Square Configuration
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_ENVIRONMENT=sandbox

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Development Setup

#### **Option 1: Docker (Recommended)**
```bash
# Build and start all services
docker compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

#### **Option 2: Local Development**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt

# Start backend server
python main.py

# Start frontend development server
npm run dev
```


## 📁 Project Structure

```
UTJN-website/
├── app/                          # Next.js frontend
│   ├── admin/                    # Admin dashboard
│   ├── api/                      # API routes
│   ├── components/               # Reusable components
│   ├── contexts/                 # React contexts
│   ├── events/                   # Event pages
│   ├── gallery/                  # Photo galleries
│   ├── hooks/                    # Custom hooks
│   └── ...
├── authentication/               # FastAPI backend
│   ├── data_access/             # Database operations
│   ├── use_case/                # Business logic
│   ├── dto/                     # Data transfer objects
│   └── ...
├── prisma/                      # Database schema
├── public/                      # Static assets
├── lib/                         # Utility functions
└── ...
```

## 🔧 Configuration

### AWS Services
- **Cognito**: User authentication
- **RDS**: PostgreSQL database
- **Secrets Manager**: Secure credential storage
- **S3**: File storage (optional)

### Square Integration
- **Payment Processing**: Secure payment handling
- **Web Payments SDK**: Client-side payment integration
- **Refund Processing**: Automated refund handling

### Database Schema
- **Users**: User profiles and authentication
- **Events**: Event information and configuration
- **EventRegistrations**: Registration tracking
- **TicketTiers**: Advanced ticketing system
- **SubEvents**: Complex event structures
- **Forms**: Custom form management

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
python -m pytest

# Run database tests
npx prisma db seed
```

## 📊 Analytics & Monitoring

- **Event Analytics**: Registration trends, capacity utilization
- **User Analytics**: Engagement metrics, demographic data
- **Financial Analytics**: Revenue tracking, payment success rates
- **System Analytics**: Performance monitoring, error tracking

## 🔒 Security Features

- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control
- **Data Encryption**: End-to-end encryption
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy

## 🌐 Deployment

### Production Deployment
```bash
# Build production images
docker compose -f docker-compose.prod.yml up --build

# Environment variables for production
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://api.utjn.com
```

### Environment Variables
- **Development**: Local development configuration
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is proprietary software for the University of Toronto Japanese Network.

---

**Built with ❤️ for the University of Toronto Japanese Network**