'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProfileInfoPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load existing user data if available
  useEffect(() => {
    const loadUserData = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setFirstName(data.user.firstName || '');
            setLastName(data.user.lastName || '');
            setMajor(data.user.major || '');
            setGradYear(data.user.graduationYear?.toString() || '');
            setUniversity(data.user.university || '');
            setIsEditing(true);
          }
        }
      } catch (err) {
        console.log('No existing profile found, creating new one');
      }
    };

    loadUserData();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          major,
          graduationYear: parseInt(gradYear),
          university,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User profile saved:', data);
        // Redirect to home page
        router.push('/');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save profile information');
      }
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: "url('/UofT.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-0" />

      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-2">
          {isEditing ? 'Edit Profile' : 'Personal Info'}
        </h1>
        <p className="text-sm text-center text-gray-700 dark:text-gray-300 mb-6">
          {isEditing 
            ? 'Update your personal information below.'
            : 'Please provide your name, university, major, and expected graduation year.'
          }
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-medium text-left">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">University</label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            >
              <option value="" disabled hidden>
                -- Select your university --
              </option>
              <option>University of Toronto</option>
              <option>Exchange Program</option>
              <option>Other Universities</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Major</label>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            >
              <option value="" disabled hidden>
                -- Select your major --
              </option>
              <option value="Computer Science">Computer Science</option>
              <option value="Computer Engineering">Computer Engineering</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Chemical Engineering">Chemical Engineering</option>
              <option value="Industrial Engineering">Industrial Engineering</option>
              <option value="Materials Science & Engineering">Materials Science & Engineering</option>
              <option value="Mineral Engineering">Mineral Engineering</option>
              <option value="Engineering Science">Engineering Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Psychology">Psychology</option>
              <option value="Economics">Economics</option>
              <option value="Business Administration">Business Administration</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts & Science">Arts & Science</option>
              <option value="Architecture">Architecture</option>
              <option value="Urban Planning">Urban Planning</option>
              <option value="Forestry">Forestry</option>
              <option value="Kinesiology">Kinesiology</option>
              <option value="Nursing">Nursing</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Medicine">Medicine</option>
              <option value="Law">Law</option>
              <option value="Education">Education</option>
              <option value="Social Work">Social Work</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Graduation Year</label>
            <input
              type="number"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1c2a52] text-white py-2 px-4 rounded hover:bg-[#152238] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Profile' : 'Save Profile')}
          </button>
        </form>
      </div>
    </div>
  );
}
