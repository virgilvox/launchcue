import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Layouts
const DefaultLayout = () => import('../layouts/DefaultLayout.vue');
const AuthLayout = () => import('../layouts/AuthLayout.vue');

// Auth Pages
const Login = () => import('../pages/auth/Login.vue');
const Register = () => import('../pages/auth/Register.vue');

// App Pages
const Home = () => import('../pages/Home.vue');
const Dashboard = () => import('../pages/Dashboard.vue');
const BrainDump = () => import('../pages/BrainDump.vue');
const Calendar = () => import('../pages/Calendar.vue');
const Clients = () => import('../pages/Clients.vue');
const ClientDetail = () => import('../pages/ClientDetail.vue');
const Projects = () => import('../pages/Projects.vue');
const ProjectDetail = () => import('../pages/ProjectDetail.vue');
const Tasks = () => import('../pages/Tasks.vue');
const CampaignsList = () => import('../pages/CampaignsList.vue');
const CampaignsBuilder = () => import('../pages/Campaigns.vue');
const CampaignDetail = () => import('../pages/CampaignDetail.vue');
const Team = () => import('../pages/Team.vue');
const Notes = () => import('../pages/Notes.vue');
const Resources = () => import('../pages/Resources.vue');
const Settings = () => import('../pages/Settings.vue');
const TaskDetail = () => import('../pages/TaskDetail.vue');

const routes = [
  // Auth routes (no layout)
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/register',
    name: 'register',
    component: Register
  },
  
  // App routes (with DefaultLayout)
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { requiresAuth: true }
      },
      {
        path: 'projects',
        name: 'projects',
        component: Projects,
        meta: { requiresAuth: true }
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: ProjectDetail,
        meta: { requiresAuth: true }
      },
      {
        path: 'projects/:id/edit',
        name: 'project-edit',
        component: () => import('../pages/ProjectForm.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'clients',
        name: 'clients',
        component: Clients,
        meta: { requiresAuth: true }
      },
      {
        path: 'clients/:id',
        name: 'client-detail',
        component: ClientDetail,
        meta: { requiresAuth: true }
      },
      {
        path: 'clients/:clientId/projects/new',
        name: 'new-client-project',
        component: () => import('../pages/ProjectForm.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: Calendar,
        meta: { requiresAuth: true }
      },
      {
        path: 'campaigns',
        name: 'campaigns-list',
        component: CampaignsList,
        meta: { requiresAuth: true }
      },
      {
        path: 'campaigns/new',
        name: 'campaign-new',
        component: CampaignsBuilder,
        meta: { requiresAuth: true }
      },
      {
        path: 'campaigns/:id',
        name: 'campaign-detail',
        component: CampaignsBuilder,
        meta: { requiresAuth: true },
        props: true
      },
      {
        path: 'team',
        name: 'team',
        component: Team,
        meta: { requiresAuth: true }
      },
      {
        path: 'notes',
        name: 'notes',
        component: Notes,
        meta: { requiresAuth: true }
      },
      {
        path: 'resources',
        name: 'resources',
        component: Resources,
        meta: { requiresAuth: true }
      },
      {
        path: 'brain-dump',
        name: 'braindump',
        component: BrainDump,
        meta: { requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../pages/Profile.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: Tasks,
        meta: { requiresAuth: true }
      },
      {
        path: 'tasks/:id',
        name: 'task-detail',
        component: TaskDetail,
        meta: { requiresAuth: true },
        props: true
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: { requiresAuth: true }
      }
    ]
  },
  
  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router; 