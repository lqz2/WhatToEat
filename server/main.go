package main

import (
	"fmt"
	"log"
	"os"

	"whattoeat/database"
	"whattoeat/handlers"
	"whattoeat/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("未找到 .env 文件，使用系统环境变量")
	}

	// 初始化数据库
	database.Init()

	// 创建 Gin 引擎
	r := gin.Default()

	// 配置 CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API 路由组
	api := r.Group("/api")
	{
		// 认证路由（无需 Token）
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// 菜品管理
			protected.GET("/dishes", handlers.GetDishes)
			protected.POST("/dishes", handlers.CreateDish)
			protected.PUT("/dishes/:id", handlers.UpdateDish)
			protected.DELETE("/dishes/:id", handlers.DeleteDish)
			protected.PUT("/dishes/:id/favorite", handlers.ToggleFavorite)

			// 推荐与偏好
			protected.GET("/recommend", handlers.GetRecommendations)
			protected.GET("/preferences", handlers.GetPreferences)
			protected.POST("/preferences", handlers.CreatePreference)
			protected.DELETE("/preferences/:cuisine", handlers.DeletePreference)

			// 共享功能
			protected.POST("/share", handlers.ShareMenu)
			protected.DELETE("/share/:id", handlers.CancelShare)
			protected.GET("/shared", handlers.GetSharedList)
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "WhatToEat API is running"})
	})

	// 启动服务
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("服务启动在端口: %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
