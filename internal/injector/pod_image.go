// Package injector contains scenario setup logic that mutates cluster state
// into a known broken condition before the candidate attempts a repair.
package injector

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// Result describes what the injector changed in the cluster.
type Result struct {
	Action  string
	Message string
}

// PodImageInjector creates or mutates a pod so the first container uses a
// deliberately broken image. That gives the learner a concrete repair task.
type PodImageInjector struct {
	namespace     string
	podName       string
	containerName string
	brokenImage   string
}

// NewPodImageInjector constructs a pod image injector.
func NewPodImageInjector(namespace, podName, containerName, brokenImage string) *PodImageInjector {
	return &PodImageInjector{
		namespace:     namespace,
		podName:       podName,
		containerName: containerName,
		brokenImage:   brokenImage,
	}
}

func (i *PodImageInjector) Name() string {
	return fmt.Sprintf("inject-pod-image/%s/%s", i.namespace, i.podName)
}

// Inject ensures the target pod exists and carries the broken image.
// It mutates pod spec only; actual status transitions remain the job of
// Kubernetes controllers on a live cluster.
func (i *PodImageInjector) Inject(ctx context.Context, client kubernetes.Interface) (Result, error) {
	pods := client.CoreV1().Pods(i.namespace)
	existing, err := pods.Get(ctx, i.podName, metav1.GetOptions{})
	if err != nil {
		if !apierrors.IsNotFound(err) {
			return Result{}, fmt.Errorf("get pod %s/%s: %w", i.namespace, i.podName, err)
		}

		pod := &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      i.podName,
				Namespace: i.namespace,
				Labels: map[string]string{
					"app.kubernetes.io/name":       i.podName,
					"app.kubernetes.io/managed-by": "cka-sim",
				},
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name:  i.containerName,
						Image: i.brokenImage,
					},
				},
			},
		}

		if _, err := pods.Create(ctx, pod, metav1.CreateOptions{}); err != nil {
			return Result{}, fmt.Errorf("create broken pod %s/%s: %w", i.namespace, i.podName, err)
		}

		return Result{
			Action:  "CREATED",
			Message: fmt.Sprintf("created pod %s/%s with broken image %q", i.namespace, i.podName, i.brokenImage),
		}, nil
	}

	if len(existing.Spec.Containers) == 0 {
		existing.Spec.Containers = []corev1.Container{{Name: i.containerName, Image: i.brokenImage}}
	} else {
		existing.Spec.Containers[0].Image = i.brokenImage
		if existing.Spec.Containers[0].Name == "" {
			existing.Spec.Containers[0].Name = i.containerName
		}
	}

	if _, err := pods.Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return Result{}, fmt.Errorf("update broken pod %s/%s: %w", i.namespace, i.podName, err)
	}

	return Result{
		Action:  "UPDATED",
		Message: fmt.Sprintf("updated pod %s/%s to broken image %q", i.namespace, i.podName, i.brokenImage),
	}, nil
}
