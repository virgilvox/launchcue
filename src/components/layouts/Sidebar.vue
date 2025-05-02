<template>
  <aside class="w-64 h-screen bg-gray-900 text-white fixed left-0 top-0 z-10 overflow-auto">
    <!-- Logo -->
    <div class="p-5 flex items-center border-b border-gray-800">
      <div class="h-12 w-12 rounded-full bg-purple-800 flex items-center justify-center">
        <svg class="h-8 w-8 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 8c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm10-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </div>
      <h1 class="ml-3 text-xl font-bold">LaunchCue</h1>
    </div>
    
    <!-- Navigation Links -->
    <nav class="py-5">
      <router-link
        to="/"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Dashboard</span>
      </router-link>
      
      <router-link
        to="/clients"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span>Clients</span>
      </router-link>
      
      <router-link
        to="/projects"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span>Projects</span>
      </router-link>
      
      <router-link
        to="/tasks"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <span>Tasks</span>
      </router-link>
      
      <router-link
        to="/calendar"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Calendar</span>
      </router-link>
      
      <router-link
        to="/campaigns"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <span>Campaigns</span>
      </router-link>
      
      <router-link
        to="/brain-dump"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>Brain Dump</span>
      </router-link>
      
      <router-link
        to="/team"
        class="flex items-center px-5 py-3 my-1 text-gray-300 hover:bg-gray-800"
      >
        <svg class="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>Team</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
aside {
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
}

.router-link-active {
  background-color: #4B5563;
  border-left: 3px solid #8B5CF6;
}
</style> 