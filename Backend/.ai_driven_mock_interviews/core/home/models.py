from django.db import models

# Create your models here.

# forms.py


class Post(models.Model):
    text = models.CharField(max_length=100)
    # Add more fields as needed

    def __str__(self):
        return f"POST: {self.text}"
