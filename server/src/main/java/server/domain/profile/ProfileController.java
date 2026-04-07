package server.domain.profile;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(profileRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Profile profile) {
        return ResponseEntity.ok(profileRepository.save(profile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        profileRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}