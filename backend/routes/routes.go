package routes

import (
	"form-builder-api/controllers"
	"form-builder-api/websocket"

	"github.com/gofiber/fiber/v2"
	websocketFiber "github.com/gofiber/websocket/v2"
)

// SetupRoutes sets up all application routes
func SetupRoutes(app *fiber.App, hub *websocket.Hub) {
	// Initialize controllers
	formController := controllers.NewFormController(hub)
	responseController := controllers.NewResponseController(hub)

	// API v1 group
	api := app.Group("/api/v1")

	// Form routes
	forms := api.Group("/forms")
	forms.Post("/", formController.CreateForm)
	forms.Get("/", formController.GetForms)
	forms.Get("/:id", formController.GetForm)
	forms.Put("/:id", formController.UpdateForm)
	forms.Delete("/:id", formController.DeleteForm)
	forms.Post("/:id/publish", formController.PublishForm)
	forms.Post("/:id/duplicate", formController.DuplicateForm)

	// Public form access by token
	api.Get("/forms/public/:token", formController.GetFormByToken)

	// Response routes
	forms.Post("/:id/responses", responseController.SubmitResponse)
	forms.Get("/:id/responses", responseController.GetResponses)
	forms.Get("/:id/analytics", responseController.GetAnalytics)

	// WebSocket endpoint
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocketFiber.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocketFiber.New(func(c *websocketFiber.Conn) {
		websocket.HandleWebSocket(c, hub)
	}))

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "Form Builder API is running",
		})
	})

	// Catch all for undefined routes
	app.Use("*", func(c *fiber.Ctx) error {
		return c.Status(404).JSON(fiber.Map{
			"error": "Route not found",
		})
	})
}
