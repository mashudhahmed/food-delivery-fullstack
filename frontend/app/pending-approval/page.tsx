'use client';

import Link from 'next/link';
import { Clock, Mail, CheckCircle } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 bg-orange-100 rounded-full mb-6">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Application Submitted!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Thank you for your interest in partnering with QuickBite.
            Our team will review your application and notify you via email within 2-3 business days.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-gray-700">What happens next?</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Our team will review your application</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>We may contact you for verification</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>You'll receive an email with the decision</span>
              </li>
            </ul>
          </div>

          <Link
            href="/"
            className="inline-flex justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}