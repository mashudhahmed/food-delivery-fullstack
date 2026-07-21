export default function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-full w-full max-w-2xl"></div>
      </div>
      
      {/* Filter tabs skeleton */}
      <div className="flex gap-2 mb-8 animate-pulse">
        <div className="h-10 w-24 bg-gray-200 rounded-full"></div>
        <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
        <div className="h-10 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
      </div>
      
      {/* Restaurant cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-xl"></div>
            <div className="mt-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}