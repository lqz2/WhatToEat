package database

import (
	"fmt"
	"log"
	"os"
	"time"
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

	// === 连接池优化 (降低网络连接延迟) ===
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("获取底层数据库实例失败: %v", err)
	}

	// 限制空闲连接数，保持长连接不断开，省去每次重新建立TCP/TLS握手的时间
	sqlDB.SetMaxIdleConns(10)
	// 限制最大打开连接数
	sqlDB.SetMaxOpenConns(50)
	// 长连接的复用时间设置为1小时
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 自动迁移
	err = DB.AutoMigrate(
		&models.FridgeItem{},
		&models.UserPreference{},
		&models.SharedMenu{},
	)
	if err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	fmt.Println("数据库连接并开启连接池，自动迁移成功")
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
