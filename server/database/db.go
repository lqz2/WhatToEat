package database

import (
	"fmt"
	"log"
	"os"
	"whattoeat/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Init 初始化数据库连接
func Init() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL 环境变量未设置")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// 自动迁移
	err = DB.AutoMigrate(
		&models.FridgeItem{},
		&models.UserPreference{},
		&models.SharedMenu{},
	)
	if err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	fmt.Println("数据库连接并发起自动迁移成功")
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
