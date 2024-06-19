from home.urls import post_router
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from home import views

router = DefaultRouter()

router.registry.extend(post_router.registry)

urlpatterns = [
    path('', views.talk),
   
]
