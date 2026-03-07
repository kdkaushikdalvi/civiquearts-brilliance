import { Download, RefreshCw } from "lucide-react";

const SidebarActions = () => {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2">
      <button
        onClick={() => window.alert("Install App feature coming soon!")}
        className="group flex items-center gradient-green text-green-accent-foreground rounded-l-xl pl-3 pr-4 py-3 shadow-lg hover:pr-6 transition-all duration-300"
        aria-label="Install App"
      >
        <Download className="h-5 w-5" />
        <span className="ml-2 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Install App
        </span>
      </button>
      <button
        onClick={() => window.location.reload()}
        className="group flex items-center gradient-saffron text-saffron-foreground rounded-l-xl pl-3 pr-4 py-3 shadow-lg hover:pr-6 transition-all duration-300"
        aria-label="Reload App"
      >
        <RefreshCw className="h-5 w-5" />
        <span className="ml-2 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Reload App
        </span>
      </button>
    </div>
  );
};

export default SidebarActions;
