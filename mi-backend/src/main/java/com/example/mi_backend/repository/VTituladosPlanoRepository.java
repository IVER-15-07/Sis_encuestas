

package com.example.mi_backend.repository;

import com.example.mi_backend.model.VTituladosPlano;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VTituladosPlanoRepository extends JpaRepository<VTituladosPlano, Long> {
}