export function PresentationSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
      <div className="lg:w-3/4">
        <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-md"></div>
        <div className="flex justify-between mt-4">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded self-center"></div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
      <div className="lg:w-1/4 space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-md mb-4"></div>
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded mt-1"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
