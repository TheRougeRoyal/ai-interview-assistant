import PDFAssessmentUpload from '@/components/pdf-assessment/PDFAssessmentUpload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, FileText, Zap, Target, CheckCircle } from 'lucide-react'

export default function PDFAssessmentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered PDF Assessment System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Replace Adobe PDF processing with our in-house AI system that extracts skills, 
            analyzes experience, and generates personalized assessment questions.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Smart PDF Processing</h3>
              <p className="text-sm text-gray-600">
                Advanced text extraction and document structure analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Brain className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">AI Skill Extraction</h3>
              <p className="text-sm text-gray-600">
                Automatically identify and categorize technical skills and experience
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Personalized Questions</h3>
              <p className="text-sm text-gray-600">
                Generate skill-based assessment questions tailored to candidate experience
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Instant Feedback</h3>
              <p className="text-sm text-gray-600">
                Get immediate strengths analysis and improvement recommendations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Upload Component */}
        <PDFAssessmentUpload />

        {/* Benefits */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Why Choose Our In-House System?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-600">Advantages Over Adobe PDF Services</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">No external API dependencies or costs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">AI-powered skill extraction and analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Automatic question generation based on skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Complete data privacy and control</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Customizable assessment criteria</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-blue-600">Key Features</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Multiple question types: multiple-choice, coding, scenarios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Difficulty adjustment based on experience level</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Comprehensive skill categorization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Real-time processing and feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Fallback mechanisms for reliability</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">PDF Processing</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Uses pdftotext and pdf-parse for reliable text extraction with fallback mechanisms.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Layout preservation</li>
                  <li>• Metadata extraction</li>
                  <li>• Multi-page support</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">AI Analysis</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Leverages GPT-4 for intelligent document structure analysis and skill extraction.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Section identification</li>
                  <li>• Skill categorization</li>
                  <li>• Experience analysis</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Question Generation</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Creates contextual assessment questions based on candidate's specific skills and experience.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Adaptive difficulty</li>
                  <li>• Multiple question types</li>
                  <li>• Time estimation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}