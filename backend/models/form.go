package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FieldType represents the type of form field
type FieldType string

const (
	FieldTypeText         FieldType = "text"
	FieldTypeTextarea     FieldType = "textarea"
	FieldTypeEmail        FieldType = "email"
	FieldTypeNumber       FieldType = "number"
	FieldTypeMultipleChoice FieldType = "multiple_choice"
	FieldTypeCheckbox     FieldType = "checkbox"
	FieldTypeRating       FieldType = "rating"
	FieldTypeDate         FieldType = "date"
)

// ValidationRule represents validation rules for a field
type ValidationRule struct {
	Required bool   `json:"required" bson:"required"`
	MinLength int   `json:"min_length,omitempty" bson:"min_length,omitempty"`
	MaxLength int   `json:"max_length,omitempty" bson:"max_length,omitempty"`
	Pattern   string `json:"pattern,omitempty" bson:"pattern,omitempty"`
	Min       float64 `json:"min,omitempty" bson:"min,omitempty"`
	Max       float64 `json:"max,omitempty" bson:"max,omitempty"`
}

// FieldOption represents an option for multiple choice or checkbox fields
type FieldOption struct {
	ID    string `json:"id" bson:"id"`
	Label string `json:"label" bson:"label"`
	Value string `json:"value" bson:"value"`
}

// FormField represents a single field in a form
type FormField struct {
	ID          string         `json:"id" bson:"id"`
	Type        FieldType      `json:"type" bson:"type"`
	Label       string         `json:"label" bson:"label"`
	Description string         `json:"description,omitempty" bson:"description,omitempty"`
	Placeholder string         `json:"placeholder,omitempty" bson:"placeholder,omitempty"`
	Required    bool           `json:"required" bson:"required"`
	Options     []FieldOption  `json:"options,omitempty" bson:"options,omitempty"`
	Validation  ValidationRule `json:"validation" bson:"validation"`
	Order       int            `json:"order" bson:"order"`
}

// Form represents a form document
type Form struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	Fields      []FormField        `json:"fields" bson:"fields"`
	IsPublished bool               `json:"is_published" bson:"is_published"`
	ShareToken  string             `json:"share_token" bson:"share_token"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// FormResponse represents a response to a form
type FormResponse struct {
	ID        primitive.ObjectID            `json:"id" bson:"_id,omitempty"`
	FormID    primitive.ObjectID            `json:"form_id" bson:"form_id"`
	Responses map[string]interface{}        `json:"responses" bson:"responses"`
	Metadata  map[string]interface{}        `json:"metadata,omitempty" bson:"metadata,omitempty"`
	IPAddress string                        `json:"ip_address,omitempty" bson:"ip_address,omitempty"`
	UserAgent string                        `json:"user_agent,omitempty" bson:"user_agent,omitempty"`
	CreatedAt time.Time                     `json:"created_at" bson:"created_at"`
}

// FormAnalytics represents analytics data for a form
type FormAnalytics struct {
	FormID             primitive.ObjectID `json:"form_id" bson:"form_id"`
	TotalResponses     int64              `json:"total_responses" bson:"total_responses"`
	ResponsesLast24h   int64              `json:"responses_last_24h" bson:"responses_last_24h"`
	ResponsesLastWeek  int64              `json:"responses_last_week" bson:"responses_last_week"`
	ResponsesLastMonth int64              `json:"responses_last_month" bson:"responses_last_month"`
	FieldAnalytics     map[string]interface{} `json:"field_analytics" bson:"field_analytics"`
	UpdatedAt          time.Time          `json:"updated_at" bson:"updated_at"`
}

// CreateFormRequest represents the request to create a new form
type CreateFormRequest struct {
	Title       string      `json:"title" validate:"required,min=1,max=200"`
	Description string      `json:"description,omitempty" validate:"max=1000"`
	Fields      []FormField `json:"fields" validate:"required,dive"`
}

// UpdateFormRequest represents the request to update a form
type UpdateFormRequest struct {
	Title       string      `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Description string      `json:"description,omitempty" validate:"max=1000"`
	Fields      []FormField `json:"fields,omitempty" validate:"omitempty,dive"`
	IsPublished *bool       `json:"is_published,omitempty"`
}

// SubmitResponseRequest represents the request to submit a form response
type SubmitResponseRequest struct {
	Responses map[string]interface{} `json:"responses" validate:"required"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}
