// Package grader runs a Scenario against a Kubernetes client and returns a
// structured GradeResult suitable for display or further processing.
package grader

import (
	"context"
	"fmt"

	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	"k8s.io/client-go/kubernetes"
)

// GradeResult holds the outcome of a single scenario evaluation.
type GradeResult struct {
	ScenarioName string
	// Score is 0 (fail) or 1 (pass). Future scenarios may use fractional
	// scores; keeping it int here is intentional conservatism.
	Score   int
	Status  string
	Message string
}

// Grader evaluates Scenarios against a Kubernetes cluster.
type Grader struct {
	client kubernetes.Interface
}

// New creates a Grader backed by the provided Kubernetes client.
// Accepting kubernetes.Interface (not *kubernetes.Clientset) lets tests
// inject a fake.Clientset without any extra wiring.
func New(client kubernetes.Interface) *Grader {
	return &Grader{client: client}
}

// Grade runs the scenario and wraps the result in a GradeResult.
func (g *Grader) Grade(ctx context.Context, s scenarios.Scenario) GradeResult {
	passed, msg, err := s.Run(ctx, g.client)
	if err != nil {
		return GradeResult{
			ScenarioName: s.Name(),
			Score:        0,
			Status:       "ERROR",
			Message:      fmt.Sprintf("scenario error: %v", err),
		}
	}
	if passed {
		return GradeResult{
			ScenarioName: s.Name(),
			Score:        1,
			Status:       "PASS",
			Message:      msg,
		}
	}
	return GradeResult{
		ScenarioName: s.Name(),
		Score:        0,
		Status:       "FAIL",
		Message:      msg,
	}
}
