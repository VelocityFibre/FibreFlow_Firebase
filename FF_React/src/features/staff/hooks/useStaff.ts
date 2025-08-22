import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService, type Staff } from '@services/staff.service';

const STAFF_QUERY_KEY = ['staff'];

// Get all staff members
export function useStaff() {
  return useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: () => staffService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get active staff members
export function useActiveStaff() {
  return useQuery({
    queryKey: [...STAFF_QUERY_KEY, 'active'],
    queryFn: () => staffService.getActiveStaff(),
    staleTime: 5 * 60 * 1000,
  });
}

// Get single staff member
export function useStaffMember(id: string) {
  return useQuery({
    queryKey: [...STAFF_QUERY_KEY, id],
    queryFn: () => staffService.getById(id),
    enabled: !!id,
  });
}

// Search staff members
export function useStaffSearch(searchTerm: string) {
  return useQuery({
    queryKey: [...STAFF_QUERY_KEY, 'search', searchTerm],
    queryFn: () => staffService.search(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute for search results
  });
}

// Create staff member
export function useCreateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Staff, 'id'>) =>
      staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });
}

// Update staff member
export function useUpdateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Staff, 'id'>> }) =>
      staffService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });
}

// Delete staff member
export function useDeleteStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });
}

// Deactivate staff member
export function useDeactivateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => staffService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });
}

// Activate staff member
export function useActivateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => staffService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });
}