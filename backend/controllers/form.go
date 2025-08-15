package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"form-builder-api/database"
	"form-builder-api/models"
	"form-builder-api/websocket"

	"github.com/gofiber/fiber/v2"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var validate = validator.New()

// FormController handles form-related operations
type FormController struct {
	collection *mongo.Collection
	hub        *websocket.Hub
}

// NewFormController creates a new form controller
func NewFormController(hub *websocket.Hub) *FormController {
	return &FormController{
		collection: database.GetCollection("forms"),
		hub:        hub,
	}
}

// generateShareToken generates a random share token
func generateShareToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// CreateForm creates a new form
func (fc *FormController) CreateForm(c *fiber.Ctx) error {
	var req models.CreateFormRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := validate.Struct(req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	form := models.Form{
		ID:          primitive.NewObjectID(),
		Title:       req.Title,
		Description: req.Description,
		Fields:      req.Fields,
		IsPublished: false,
		ShareToken:  generateShareToken(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result, err := fc.collection.InsertOne(context.Background(), form)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create form"})
	}

	form.ID = result.InsertedID.(primitive.ObjectID)

	// Broadcast form creation
	fc.hub.BroadcastGeneral("form_created", form)

	return c.Status(201).JSON(form)
}

// GetForms gets all forms
func (fc *FormController) GetForms(c *fiber.Ctx) error {
	cursor, err := fc.collection.Find(context.Background(), bson.M{})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch forms"})
	}
	defer cursor.Close(context.Background())

	var forms []models.Form
	if err := cursor.All(context.Background(), &forms); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to decode forms"})
	}

	if forms == nil {
		forms = []models.Form{}
	}

	return c.JSON(forms)
}

// GetForm gets a specific form by ID
func (fc *FormController) GetForm(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	var form models.Form
	err = fc.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch form"})
	}

	return c.JSON(form)
}

// GetFormByToken gets a form by its share token
func (fc *FormController) GetFormByToken(c *fiber.Ctx) error {
	token := c.Params("token")

	var form models.Form
	err := fc.collection.FindOne(context.Background(), bson.M{
		"share_token":  token,
		"is_published": true,
	}).Decode(&form)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Form not found or not published"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch form"})
	}

	return c.JSON(form)
}

// UpdateForm updates a form
func (fc *FormController) UpdateForm(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	var req models.UpdateFormRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := validate.Struct(req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	update := bson.M{
		"updated_at": time.Now(),
	}

	if req.Title != "" {
		update["title"] = req.Title
	}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.Fields != nil {
		update["fields"] = req.Fields
	}
	if req.IsPublished != nil {
		update["is_published"] = *req.IsPublished
	}

	result, err := fc.collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objectID},
		bson.M{"$set": update},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update form"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
	}

	// Get updated form
	var updatedForm models.Form
	err = fc.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&updatedForm)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated form"})
	}

	// Broadcast form update
	fc.hub.BroadcastGeneral("form_updated", updatedForm)

	return c.JSON(updatedForm)
}

// DeleteForm deletes a form
func (fc *FormController) DeleteForm(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	result, err := fc.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete form"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
	}

	// Also delete all responses for this form
	responseCollection := database.GetCollection("responses")
	responseCollection.DeleteMany(context.Background(), bson.M{"form_id": objectID})

	// Broadcast form deletion
	fc.hub.BroadcastGeneral("form_deleted", fiber.Map{"id": id})

	return c.JSON(fiber.Map{"message": "Form deleted successfully"})
}

// PublishForm publishes or unpublishes a form
func (fc *FormController) PublishForm(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	publishStr := c.Query("publish", "true")
	publish, err := strconv.ParseBool(publishStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid publish parameter"})
	}

	update := bson.M{
		"is_published": publish,
		"updated_at":   time.Now(),
	}

	result, err := fc.collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objectID},
		bson.M{"$set": update},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update form"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
	}

	// Get updated form
	var updatedForm models.Form
	err = fc.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&updatedForm)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated form"})
	}

	action := "unpublished"
	if publish {
		action = "published"
	}

	// Broadcast form publication status change
	fc.hub.BroadcastGeneral("form_"+action, updatedForm)

	return c.JSON(fiber.Map{
		"message": fmt.Sprintf("Form %s successfully", action),
		"form":    updatedForm,
	})
}

// DuplicateForm creates a copy of an existing form
func (fc *FormController) DuplicateForm(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	// Get the original form
	var originalForm models.Form
	err = fc.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&originalForm)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch form"})
	}

	// Create a new form with the same fields but different ID and token
	newForm := models.Form{
		ID:          primitive.NewObjectID(),
		Title:       originalForm.Title + " (Copy)",
		Description: originalForm.Description,
		Fields:      originalForm.Fields,
		IsPublished: false,
		ShareToken:  generateShareToken(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result, err := fc.collection.InsertOne(context.Background(), newForm)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to duplicate form"})
	}

	newForm.ID = result.InsertedID.(primitive.ObjectID)

	// Broadcast form creation
	fc.hub.BroadcastGeneral("form_created", newForm)

	return c.Status(201).JSON(newForm)
}
